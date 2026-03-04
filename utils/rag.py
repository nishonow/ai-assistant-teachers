import asyncio
import json
import math
import re
from dataclasses import dataclass

from google import genai

from utils.database import Database


@dataclass(slots=True)
class RetrievedChunk:
    text: str
    source: str
    score: float


class RAGService:
    def __init__(self, api_key: str, embedding_model: str, chunk_size: int = 900, chunk_overlap: int = 150) -> None:
        self.client = genai.Client(api_key=api_key)
        fallback_models = [embedding_model, "gemini-embedding-001", "text-embedding-004"]
        self.embedding_models: list[str] = list(dict.fromkeys(m.strip() for m in fallback_models if m.strip()))
        self.active_embedding_model: str | None = None
        self.embedding_disabled = False
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_into_chunks(self, text: str) -> list[str]:
        normalized = re.sub(r"\s+", " ", text).strip()
        if not normalized:
            return []

        chunks: list[str] = []
        start = 0
        text_len = len(normalized)

        while start < text_len:
            end = min(text_len, start + self.chunk_size)
            chunk = normalized[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= text_len:
                break
            start = max(0, end - self.chunk_overlap)

        return chunks

    async def index_document(self, db: Database, document_id: int, text: str) -> int:
        chunks = self.split_into_chunks(text)
        if not chunks:
            await db.replace_document_chunks(document_id, [])
            return 0

        vectors = await self.embed_texts(chunks)

        rows: list[tuple[int, str, str]] = []
        for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=False), start=1):
            if not vector:
                continue
            rows.append((index, chunk, json.dumps(vector, ensure_ascii=False)))

        await db.replace_document_chunks(document_id, rows)
        return len(rows)

    async def retrieve_relevant_chunks(self, db: Database, question: str, top_k: int = 3, max_context_chars: int = 2200) -> list[RetrievedChunk]:
        rows = await db.list_chunks_with_documents()
        if not rows:
            return []

        question_tokens = self._tokenize(question)
        question_trigrams = self._char_ngrams(question, size=3)

        question_vectors = await self.embed_texts([question])
        question_vector = question_vectors[0] if question_vectors and question_vectors[0] else []

        scored: list[RetrievedChunk] = []
        for row in rows:
            chunk_text = str(row.get("chunk_text") or "")
            if not chunk_text.strip():
                continue

            semantic_score = 0.0
            if question_vector:
                try:
                    vector = json.loads(row["embedding_json"])
                except json.JSONDecodeError:
                    vector = []

                semantic_score = self._cosine_similarity(question_vector, vector)
                if math.isnan(semantic_score):
                    semantic_score = 0.0

            lexical_score = self._lexical_overlap_score(question_tokens, chunk_text)
            trigram_score = self._char_ngram_jaccard(question_trigrams, self._char_ngrams(chunk_text, size=3))

            score = 0.75 * ((semantic_score + 1.0) / 2.0) + 0.2 * lexical_score + 0.05 * trigram_score
            if score <= 0:
                continue

            scored.append(
                RetrievedChunk(
                    text=chunk_text,
                    source=str(row.get("file_name") or "document"),
                    score=score,
                )
            )

        scored.sort(key=lambda item: item.score, reverse=True)
        selected = self._select_with_limit(scored, top_k=top_k, max_context_chars=max_context_chars, candidate_multiplier=12)
        if selected:
            return selected

        return self._lexical_fallback(rows=rows, question=question, top_k=top_k, max_context_chars=max_context_chars)

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        if self.embedding_disabled:
            return []

        models_to_try: list[str]
        if self.active_embedding_model:
            models_to_try = [self.active_embedding_model]
        else:
            models_to_try = self.embedding_models

        for model in models_to_try:
            vectors, status = await self._embed_batch(model=model, texts=texts)

            if status == "not_found":
                continue

            if status == "error":
                return []

            if len(vectors) != len(texts):
                return []

            self.active_embedding_model = model
            return vectors

        self.embedding_disabled = True
        return []

    async def _embed_batch(self, model: str, texts: list[str]) -> tuple[list[list[float]], str]:
        try:
            response = await asyncio.to_thread(
                self.client.models.embed_content,
                model=model,
                contents=texts,
            )
        except Exception as exc:
            message = str(exc).lower()
            if "404" in message or "not found" in message:
                return [], "not_found"
            return [], "error"

        vectors = self._extract_vectors(response)
        cleaned_vectors: list[list[float]] = []
        for vector in vectors:
            cleaned = [float(v) for v in vector if isinstance(v, (int, float))]
            if cleaned:
                cleaned_vectors.append(cleaned)

        return cleaned_vectors, "ok"

    def _extract_vectors(self, response: object) -> list[list[float]]:
        embeddings = getattr(response, "embeddings", None)
        if embeddings is None and isinstance(response, dict):
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
            a = vec_a[i]
            b = vec_b[i]
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

    def _lexical_fallback(self, rows: list[dict], question: str, top_k: int, max_context_chars: int) -> list[RetrievedChunk]:
        question_tokens = self._tokenize(question)
        if not question_tokens and not question.strip():
            return []

        ranked: list[RetrievedChunk] = []
        for row in rows:
            chunk_text = str(row.get("chunk_text") or "")
            if not chunk_text.strip():
                continue

            score = self._lexical_overlap_score(question_tokens, chunk_text)
            if score <= 0:
                continue

            ranked.append(
                RetrievedChunk(
                    text=chunk_text,
                    source=str(row.get("file_name") or "document"),
                    score=score,
                )
            )

        ranked.sort(key=lambda item: item.score, reverse=True)
        return self._select_with_limit(ranked, top_k=top_k, max_context_chars=max_context_chars, candidate_multiplier=12)

    def _lexical_overlap_score(self, question_tokens: set[str], chunk_text: str) -> float:
        if not question_tokens:
            return 0.0

        chunk_tokens = self._tokenize(chunk_text)
        if not chunk_tokens:
            return 0.0

        overlap = question_tokens.intersection(chunk_tokens)
        return len(overlap) / max(len(question_tokens), 1)

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
