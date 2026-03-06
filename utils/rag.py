import asyncio
import json
import logging
import math
import re
from dataclasses import dataclass

from openai import OpenAI

from utils.database import Database

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class RetrievedChunk:
    text: str
    source: str
    score: float
    semantic_score: float = 0.0
    lexical_score: float = 0.0
    trigram_score: float = 0.0
    document_id: int | None = None
    chunk_index: int | None = None


class RAGService:
    def __init__(self, api_key: str, embedding_model: str, chunk_size: int = 900, chunk_overlap: int = 150) -> None:
        self.client = OpenAI(api_key=api_key)
        fallback_models = [embedding_model, "text-embedding-3-small", "text-embedding-3-large"]
        self.embedding_models: list[str] = list(dict.fromkeys(m.strip() for m in fallback_models if m.strip()))
        self.active_embedding_model: str | None = None
        self.embedding_disabled = False
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_into_chunks(self, text: str) -> list[str]:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if not normalized:
            return []

        paragraphs = [part.strip() for part in re.split(r"\n{2,}", normalized) if part.strip()]
        if not paragraphs:
            return []

        chunks: list[str] = []

        def append_chunk(value: str) -> None:
            cleaned = value.strip()
            if cleaned:
                chunks.append(cleaned)

        def with_overlap(next_block: str) -> str:
            if not chunks or self.chunk_overlap <= 0:
                return next_block.strip()

            overlap = chunks[-1][-self.chunk_overlap :].strip()
            if not overlap:
                return next_block.strip()

            candidate = f"{overlap}\n\n{next_block.strip()}"
            if len(candidate) <= self.chunk_size:
                return candidate

            return next_block.strip()

        current_chunk = ""

        for paragraph in paragraphs:
            if len(paragraph) > self.chunk_size:
                if current_chunk:
                    append_chunk(current_chunk)
                    current_chunk = ""

                start = 0
                paragraph_len = len(paragraph)
                while start < paragraph_len:
                    end = min(paragraph_len, start + self.chunk_size)
                    if end < paragraph_len:
                        boundary = paragraph.rfind(" ", start + int(self.chunk_size * 0.55), end)
                        if boundary > start:
                            end = boundary

                    part = paragraph[start:end].strip()
                    if part:
                        append_chunk(with_overlap(part))

                    if end >= paragraph_len:
                        break

                    start = max(0, end - self.chunk_overlap)

                continue

            if not current_chunk:
                current_chunk = with_overlap(paragraph)
                continue

            candidate = f"{current_chunk}\n\n{paragraph}".strip()
            if len(candidate) <= self.chunk_size:
                current_chunk = candidate
            else:
                append_chunk(current_chunk)
                current_chunk = with_overlap(paragraph)

        if current_chunk:
            append_chunk(current_chunk)

        return chunks

    async def index_document(self, db: Database, document_id: int, text: str) -> int:
        chunks = self.split_into_chunks(text)
        if not chunks:
            await db.replace_document_chunks(document_id, [])
            return 0

        vectors = await self.embed_texts(chunks)
        vectors_by_index: dict[int, list[float]] = {
            index: vector
            for index, vector in enumerate(vectors, start=1)
            if isinstance(vector, list) and vector
        }

        # Do not report indexing success when embeddings are unavailable.
        if not vectors_by_index:
            logger.warning("Indexing aborted for document_id=%s: no embeddings generated", document_id)
            await db.replace_document_chunks(document_id, [])
            return 0

        rows: list[tuple[int, str, str]] = []
        for index, chunk in enumerate(chunks, start=1):
            vector = vectors_by_index.get(index, [])
            rows.append((index, chunk, json.dumps(vector, ensure_ascii=False)))

        await db.replace_document_chunks(document_id, rows)
        if len(vectors_by_index) < len(chunks):
            logger.warning(
                "Partial embeddings for document_id=%s: embedded=%s total=%s",
                document_id,
                len(vectors_by_index),
                len(chunks),
            )
        return len(rows)

    async def retrieve_relevant_chunks(self, db: Database, question: str, top_k: int = 10, max_context_chars: int = 9000) -> list[RetrievedChunk]:
        rows = await db.list_chunks_with_documents()
        if not rows:
            return []

        candidate_k = 30
        final_k = max(top_k, 10)
        primary_min_score = 0.24
        fallback_min_score = 0.18

        primary_candidates, _ = await self._retrieve_once(
            rows=rows,
            question=question,
            top_k=candidate_k,
            max_context_chars=max_context_chars,
            min_score=primary_min_score,
            fallback_min_score=fallback_min_score,
        )

        return self._finalize_chunks(primary_candidates, final_k=final_k, max_context_chars=max_context_chars)

    async def _retrieve_once(
        self,
        rows: list[dict],
        question: str,
        top_k: int,
        max_context_chars: int,
        min_score: float = 0.40,
        fallback_min_score: float = 0.35,
    ) -> tuple[list[RetrievedChunk], list[RetrievedChunk]]:
        question_forms = self._question_forms(question)
        if not question_forms:
            return [], []

        question_token_sets = [self._tokenize(item) for item in question_forms]
        question_trigram_sets = [self._char_ngrams(item, size=3) for item in question_forms]
        query_for_embedding = question_forms[0]

        question_vectors = await self.embed_texts([query_for_embedding])
        question_vector = question_vectors[0] if question_vectors and question_vectors[0] else []
        has_query_embedding = bool(question_vector)

        scored: list[RetrievedChunk] = []
        for row in rows:
            chunk_text = str(row.get("chunk_text") or "")
            if not chunk_text.strip():
                continue

            chunk_tokens = self._tokenize(chunk_text)
            chunk_trigrams = self._char_ngrams(chunk_text, size=3)
            lexical_score = self._max_lexical_overlap(question_token_sets, chunk_tokens)
            trigram_score = self._max_trigram_overlap(question_trigram_sets, chunk_trigrams)

            chunk_vector = self._parse_embedding_json(row.get("embedding_json"))
            semantic_score = 0.0
            has_semantic_pair = has_query_embedding and bool(chunk_vector)
            if has_semantic_pair:
                semantic_score = self._cosine_similarity(question_vector, chunk_vector)
                if math.isnan(semantic_score):
                    semantic_score = 0.0

            score = self._combine_scores(
                semantic_score=semantic_score,
                lexical_score=lexical_score,
                trigram_score=trigram_score,
                has_semantic_pair=has_semantic_pair,
            )

            scored.append(
                RetrievedChunk(
                    text=chunk_text,
                    source=str(row.get("file_name") or "document"),
                    score=score,
                    semantic_score=self._normalize_cosine(semantic_score) if has_semantic_pair else 0.0,
                    lexical_score=lexical_score,
                    trigram_score=trigram_score,
                    document_id=int(row["document_id"]) if row.get("document_id") is not None else None,
                    chunk_index=int(row["chunk_index"]) if row.get("chunk_index") is not None else None,
                )
            )

        scored.sort(key=lambda item: item.score, reverse=True)
        self._log_top_scores(question=question, items=scored[:5], has_query_embedding=has_query_embedding)

        filtered = [item for item in scored if item.score >= min_score]
        selected = self._select_with_limit(filtered, top_k=top_k, max_context_chars=max_context_chars, candidate_multiplier=48)
        if len(selected) < top_k:
            relaxed = [item for item in scored if item.score >= fallback_min_score]
            selected = self._select_with_limit(relaxed, top_k=top_k, max_context_chars=max_context_chars, candidate_multiplier=48)
        if selected:
            return selected, scored

        fallback = self._lexical_fallback(
            rows=rows,
            question_forms=question_forms,
            top_k=top_k,
            max_context_chars=max_context_chars,
        )
        if fallback:
            return fallback, scored

        return [], scored

    @staticmethod
    def _is_near_duplicate_chunk(candidate: RetrievedChunk, selected: list[RetrievedChunk]) -> bool:
        if candidate.document_id is None or candidate.chunk_index is None:
            return False

        for existing in selected:
            if existing.document_id != candidate.document_id:
                continue
            if existing.chunk_index is None:
                continue
            if abs(existing.chunk_index - candidate.chunk_index) <= 2:
                return True

        return False

    def _finalize_chunks(self, items: list[RetrievedChunk], final_k: int, max_context_chars: int) -> list[RetrievedChunk]:
        if not items:
            return []

        sorted_items = sorted(items, key=lambda item: item.score, reverse=True)
        selected: list[RetrievedChunk] = []
        selected_keys: set[tuple[int | None, int | None, str]] = set()
        total_chars = 0
        min_target = min(8, len(sorted_items))

        for item in sorted_items:
            if len(selected) >= final_k:
                break

            key = (item.document_id, item.chunk_index, item.text)
            if key in selected_keys:
                continue
            if self._is_near_duplicate_chunk(item, selected):
                continue

            context_text = f"[{item.source}] {item.text}".strip()
            if not context_text:
                continue
            if total_chars + len(context_text) > max_context_chars:
                continue

            selected.append(item)
            selected_keys.add(key)
            total_chars += len(context_text)

        if len(selected) >= min_target:
            return selected

        for item in sorted_items:
            if len(selected) >= final_k:
                break

            key = (item.document_id, item.chunk_index, item.text)
            if key in selected_keys:
                continue

            context_text = f"[{item.source}] {item.text}".strip()
            if not context_text:
                continue
            if total_chars + len(context_text) > max_context_chars:
                continue

            selected.append(item)
            selected_keys.add(key)
            total_chars += len(context_text)

        return selected

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        if self.embedding_disabled:
            return []

        models_to_try: list[str] = list(self.embedding_models)
        if self.active_embedding_model:
            models_to_try = [self.active_embedding_model] + [item for item in models_to_try if item != self.active_embedding_model]

        not_found_count = 0
        for model in models_to_try:
            vectors, status = await self._embed_batch(model=model, texts=texts)

            if status == "not_found":
                not_found_count += 1
                continue

            if status == "error":
                continue

            if len(vectors) != len(texts):
                logger.warning(
                    "Embedding size mismatch for model=%s: expected=%s got=%s",
                    model,
                    len(texts),
                    len(vectors),
                )
                continue

            self.active_embedding_model = model
            self.embedding_disabled = False
            return vectors

        if models_to_try and not_found_count == len(models_to_try):
            self.embedding_disabled = True
            logger.error("All embedding models are unavailable: %s", models_to_try)

        return []

    async def _embed_batch(self, model: str, texts: list[str]) -> tuple[list[list[float]], str]:
        try:
            response = await asyncio.to_thread(
                self.client.embeddings.create,
                model=model,
                input=texts,
            )
        except Exception as exc:
            message = str(exc).lower()
            if "404" in message or "not found" in message or "does not exist" in message:
                logger.warning("Embedding model not found: %s", model)
                return [], "not_found"

            logger.warning("Embedding request failed for model=%s: %s", model, str(exc))
            return [], "error"

        vectors = self._extract_vectors(response)
        cleaned_vectors: list[list[float]] = []
        for vector in vectors:
            cleaned = [float(v) for v in vector if isinstance(v, (int, float))]
            if cleaned:
                cleaned_vectors.append(cleaned)

        return cleaned_vectors, "ok"

    def _extract_vectors(self, response: object) -> list[list[float]]:
        data = getattr(response, "data", None)
        if isinstance(data, list):
            vectors: list[list[float]] = []
            for item in data:
                embedding = getattr(item, "embedding", None)
                if isinstance(embedding, list):
                    vectors.append(embedding)
            if vectors:
                return vectors

        embeddings = getattr(response, "embeddings", None)
        if embeddings is None and isinstance(response, dict):
            data = response.get("data")
            if isinstance(data, list):
                vectors = []
                for item in data:
                    if isinstance(item, dict) and isinstance(item.get("embedding"), list):
                        vectors.append(item["embedding"])
                if vectors:
                    return vectors
            embeddings = response.get("embeddings")

        vectors: list[list[float]] = []

        if isinstance(embeddings, list):
            for item in embeddings:
                vector = self._extract_values(item)
                if vector:
                    vectors.append(vector)
            return vectors

        single_vector = self._extract_values(response)
        if single_vector:
            vectors.append(single_vector)

        return vectors

    def _extract_values(self, payload: object) -> list[float]:
        if payload is None:
            return []

        if isinstance(payload, dict):
            if isinstance(payload.get("values"), list):
                return payload["values"]
            if "embedding" in payload:
                return self._extract_values(payload["embedding"])

        values = getattr(payload, "values", None)
        if isinstance(values, list):
            return values

        embedding = getattr(payload, "embedding", None)
        if embedding is not None:
            return self._extract_values(embedding)

        return []

    @staticmethod
    def _parse_embedding_json(raw: object) -> list[float]:
        if raw is None:
            return []

        parsed = raw
        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                return []

        if not isinstance(parsed, list):
            return []

        return [float(item) for item in parsed if isinstance(item, (int, float))]

    @staticmethod
    def _combine_scores(semantic_score: float, lexical_score: float, trigram_score: float, has_semantic_pair: bool) -> float:
        if has_semantic_pair:
            semantic_normalized = RAGService._normalize_cosine(semantic_score)
            return (0.88 * semantic_normalized) + (0.08 * lexical_score) + (0.04 * trigram_score)

        # Lexical-only fallback path when embeddings are unavailable.
        return (0.85 * lexical_score) + (0.15 * trigram_score)

    @staticmethod
    def _normalize_cosine(value: float) -> float:
        # Keep only positive semantic similarity so unrelated chunks stay near 0.
        return max(0.0, min(1.0, value))

    @staticmethod
    def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        if not vec_a or not vec_b:
            return 0.0

        size = min(len(vec_a), len(vec_b))
        if size == 0:
            return 0.0

        dot = 0.0
        norm_a = 0.0
        norm_b = 0.0

        for i in range(size):
            try:
                a = float(vec_a[i])
                b = float(vec_b[i])
            except (TypeError, ValueError):
                continue

            dot += a * b
            norm_a += a * a
            norm_b += b * b

        if norm_a <= 0 or norm_b <= 0:
            return 0.0

        return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))

    @staticmethod
    def _select_with_limit(items: list[RetrievedChunk], top_k: int, max_context_chars: int, candidate_multiplier: int = 8) -> list[RetrievedChunk]:
        selected: list[RetrievedChunk] = []
        total_chars = 0

        for item in items[: max(top_k, 1) * max(candidate_multiplier, 1)]:
            context_text = f"[{item.source}] {item.text}".strip()
            if not context_text:
                continue

            if total_chars + len(context_text) > max_context_chars:
                continue

            selected.append(item)
            total_chars += len(context_text)

            if len(selected) >= top_k:
                break

        return selected

    def _lexical_fallback(self, rows: list[dict], question_forms: list[str], top_k: int, max_context_chars: int) -> list[RetrievedChunk]:
        question_token_sets = [self._tokenize(item) for item in question_forms if item.strip()]
        question_trigram_sets = [self._char_ngrams(item, size=3) for item in question_forms if item.strip()]
        if not question_token_sets and not question_trigram_sets:
            return []

        ranked: list[RetrievedChunk] = []
        for row in rows:
            chunk_text = str(row.get("chunk_text") or "")
            if not chunk_text.strip():
                continue

            chunk_tokens = self._tokenize(chunk_text)
            chunk_trigrams = self._char_ngrams(chunk_text, size=3)
            lexical_score = self._max_lexical_overlap(question_token_sets, chunk_tokens)
            trigram_score = self._max_trigram_overlap(question_trigram_sets, chunk_trigrams)
            score = (0.85 * lexical_score) + (0.15 * trigram_score)

            if score < 0.11:
                continue

            ranked.append(
                RetrievedChunk(
                    text=chunk_text,
                    source=str(row.get("file_name") or "document"),
                    score=score,
                    lexical_score=lexical_score,
                    trigram_score=trigram_score,
                    document_id=int(row["document_id"]) if row.get("document_id") is not None else None,
                    chunk_index=int(row["chunk_index"]) if row.get("chunk_index") is not None else None,
                )
            )

        ranked.sort(key=lambda item: item.score, reverse=True)
        return self._select_with_limit(ranked, top_k=top_k, max_context_chars=max_context_chars, candidate_multiplier=16)

    @staticmethod
    def _lexical_overlap_score(question_tokens: set[str], chunk_tokens: set[str]) -> float:
        if not question_tokens or not chunk_tokens:
            return 0.0

        overlap = question_tokens.intersection(chunk_tokens)
        return len(overlap) / max(len(question_tokens), 1)

    def _max_lexical_overlap(self, question_token_sets: list[set[str]], chunk_tokens: set[str]) -> float:
        if not question_token_sets or not chunk_tokens:
            return 0.0

        return max((self._lexical_overlap_score(tokens, chunk_tokens) for tokens in question_token_sets), default=0.0)

    def _max_trigram_overlap(self, question_trigram_sets: list[set[str]], chunk_trigrams: set[str]) -> float:
        if not question_trigram_sets or not chunk_trigrams:
            return 0.0

        return max((self._char_ngram_jaccard(item, chunk_trigrams) for item in question_trigram_sets), default=0.0)

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        tokens = re.findall(r"[^\W_]+", text.lower(), flags=re.UNICODE)
        return {token for token in tokens if len(token) >= 3}

    @staticmethod
    def _question_forms(question: str) -> list[str]:
        normalized = re.sub(r"\s+", " ", question).strip()
        if not normalized:
            return []

        lowered = normalized.lower()
        no_punct = re.sub(r"[^\w\s]+", " ", lowered, flags=re.UNICODE)
        no_punct = re.sub(r"\s+", " ", no_punct).strip()

        forms: list[str] = [normalized]
        for item in (lowered, no_punct):
            if item and item not in forms:
                forms.append(item)

        return forms

    @staticmethod
    def _char_ngrams(text: str, size: int = 3) -> set[str]:
        normalized = re.sub(r"\s+", " ", text.lower()).strip()
        if len(normalized) < size:
            return {normalized} if normalized else set()

        return {normalized[i : i + size] for i in range(len(normalized) - size + 1)}

    @staticmethod
    def _char_ngram_jaccard(first: set[str], second: set[str]) -> float:
        if not first or not second:
            return 0.0

        union = first.union(second)
        if not union:
            return 0.0

        return len(first.intersection(second)) / len(union)

    @staticmethod
    def _log_top_scores(question: str, items: list[RetrievedChunk], has_query_embedding: bool) -> None:
        if not items:
            logger.info("RAG: no candidates for question=%r", question[:120])
            return

        summary = "; ".join(
            f"s={item.score:.3f}|sem={item.semantic_score:.3f}|lex={item.lexical_score:.3f}|tri={item.trigram_score:.3f}|doc={item.document_id}|idx={item.chunk_index}"
            for item in items
        )
        logger.info(
            "RAG candidates (embedding=%s) question=%r top=%s",
            has_query_embedding,
            question[:120],
            summary,
        )
