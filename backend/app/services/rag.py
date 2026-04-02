import asyncio
import json
import logging
import os
import re
from collections.abc import Iterable
from datetime import datetime

from lingua import LanguageDetectorBuilder
from openai import AsyncOpenAI
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Chunk, Document, Message
from app.services.embeddings import embed_chunks, embed_text
from app.services.rag_prompts import (
    ANALYZE_QUESTION_SYSTEM_PROMPT,
    HYDE_SYSTEM_PROMPT,
    build_answer_system_prompt,
    build_small_talk_system_prompt,
)

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
detector = LanguageDetectorBuilder.from_all_languages().build()

CHAT_MODEL = "gpt-4o-mini"
EMBEDDING_BLEND_QUERY = 0.78
EMBEDDING_BLEND_HYDE = 0.22
VECTOR_SCORE_WEIGHT = 0.54
LEXICAL_WEIGHT = 0.28
KEYWORD_WEIGHT = 0.18
HYDE_TRIGGER_DISTANCE = 0.28
HYDE_TRIGGER_OVERLAP = 0.16
TOP_K_RETRIEVAL = 100
TOP_K_LEXICAL = 140
TOP_K_DOCS = 2
TOP_K_CONTEXT = 10
MAX_CHUNKS_PER_DOC = 6
MAX_ANCHOR_CHUNKS_PER_DOC = 3
NEIGHBOR_CHUNK_RADIUS = 1
MAX_HISTORY_MESSAGES = 8
MAX_RETRIEVAL_HISTORY_MESSAGES = 2
MAX_RETRIEVAL_CONTEXT_CHARS = 320
DOC_SCORE_TOP_WEIGHT = 0.48
DOC_SCORE_AVG_WEIGHT = 0.18
DOC_SCORE_OVERLAP_WEIGHT = 0.14
DOC_SCORE_COUNT_WEIGHT = 0.08
DOC_SCORE_FILENAME_WEIGHT = 0.12
DOC_SELECTION_RATIO = 0.62
DOC_SELECTION_DELTA = 0.14
SECONDARY_DOC_MIN_CANDIDATES = 2
SECONDARY_DOC_MIN_TITLE_OVERLAP = 0.08
CHUNK_SCORE_RATIO = 0.42
CHUNK_SCORE_MIN = 0.12
DOMINANT_DOC_SCORE_RATIO = 1.14
DOMINANT_DOC_OVERLAP_DELTA = 0.08
MAX_KEYWORDS = 10
MIN_KEYWORD_LENGTH = 3
RAG_LOG_DIR = os.path.join("uploads", "rag_logs")

ALLOWED_ROLES = {"user", "assistant"}
FOLLOW_UP_PREVIOUS_ANSWER_PHRASES = {
    "previous answer",
    "last answer",
    "your answer",
    "previous reply",
    "last reply",
    "what you said",
    "say that",
    "tell me that",
    "tell me your answer",
    "answer in english",
    "reply in english",
    "that in english",
    "previous answer in english",
    "предыдущий ответ",
    "последний ответ",
    "твой ответ",
    "ваш ответ",
    "то что ты сказал",
    "что ты сказал",
    "ответ на английском",
    "на английском",
    "переведи ответ",
}
OUTPUT_LANGUAGE_HINTS = {
    "English": ("in english", "english please", "answer in english", "reply in english", "на английском", "по-английски"),
    "Russian": ("in russian", "russian please", "answer in russian", "reply in russian", "на русском", "по-русски"),
    "Kyrgyz": ("in kyrgyz", "kyrgyz please", "answer in kyrgyz", "reply in kyrgyz", "кыргызча", "на кыргызском"),
}
STOPWORDS = {
    "about", "after", "all", "also", "and", "any", "are", "but", "can", "does", "for", "from",
    "have", "how", "into", "its", "may", "not", "now", "one", "only", "other", "our", "out", "should",
    "such", "that", "the", "their", "them", "then", "there", "these", "they", "this", "those", "what", "when",
    "where", "which", "while", "with", "would", "your", "you", "как", "или", "для", "это", "при", "что", "кто",
    "где", "если", "есть", "могут", "могу", "может", "какие", "какой", "какая",
}


def detect_language(question: str) -> str:
    stripped = question.strip()
    if not stripped:
        return "unknown"

    try:
        lang = detector.detect_language_of(stripped)
        return lang.name.capitalize() if lang else "unknown"
    except Exception:
        logger.exception("language detection failed; falling back to script family")
        cyrillic = sum(0x0410 <= ord(char) <= 0x044F or ord(char) in {0x0401, 0x0451} for char in stripped)
        latin = sum(0x0041 <= ord(char) <= 0x005A or 0x0061 <= ord(char) <= 0x007A for char in stripped)
        if not (cyrillic or latin):
            return "unknown"
        return "Cyrillic" if cyrillic >= latin else "English"


async def _call_chat(messages: list[dict], *, temperature: float = 0, max_tokens: int | None = None, response_format: dict | None = None) -> str:
    payload = {
        "model": CHAT_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    if response_format is not None:
        payload["response_format"] = response_format

    response = await client.chat.completions.create(**payload)
    return (response.choices[0].message.content or "").strip()


async def analyze_question(question: str, retrieval_context: str = "") -> dict:
    prompt = question if not retrieval_context else f"Current question:\n{question}\n\nRecent context:\n{retrieval_context}"
    try:
        response_text = await _call_chat(
            [
                {"role": "system", "content": ANALYZE_QUESTION_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        return json.loads(response_text)
    except Exception:
        logger.exception("analyze_question failed; falling back to basic defaults")
        return {
            "intent": "document_question",
            "language": "unknown",
            "queries": [question.strip()]
        }


async def generate_hypothetical_answer(question: str, retrieval_context: str = "") -> str:
    prompt = question if not retrieval_context else f"Current question:\n{question}\n\nRecent related context:\n{retrieval_context}"
    return await _call_chat(
        [
            {
                "role": "system",
                "content": HYDE_SYSTEM_PROMPT,
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0,
    )





async def _fetch_vector_candidates(embedding: list[float], db: AsyncSession) -> list[tuple[Chunk, float]]:
    distance_expr = Chunk.embedding.cosine_distance(embedding)
    rows = (
        await db.execute(
            select(
                Chunk,
                distance_expr.label("distance"),
            )
            .order_by(distance_expr)
            .limit(TOP_K_RETRIEVAL)
        )
    ).all()
    return [(chunk, float(distance)) for chunk, distance in rows]


def _tokenize(text: str) -> set[str]:
    return {token.lower() for token in re.findall(r"[^\W\d_]{2,}", text.lower(), flags=re.UNICODE)}


def _extract_keywords(question_texts: list[str]) -> list[str]:
    weighted_tokens: dict[str, int] = {}
    for text in question_texts:
        for token in re.findall(r"[^\W\d_]{3,}", text.lower(), flags=re.UNICODE):
            if len(token) < MIN_KEYWORD_LENGTH or token in STOPWORDS:
                continue
            weighted_tokens[token] = weighted_tokens.get(token, 0) + 1

    ranked_tokens = sorted(weighted_tokens.items(), key=lambda item: (-item[1], -len(item[0]), item[0]))
    return [token for token, _ in ranked_tokens[:MAX_KEYWORDS]]


def _best_lexical_overlap(question_texts: list[str], text: str) -> float:
    if not question_texts:
        return 0.0

    text_tokens = _tokenize(text)
    if not text_tokens:
        return 0.0

    best_overlap = 0.0
    for question_text in question_texts:
        question_tokens = _tokenize(question_text)
        if not question_tokens:
            continue
        overlap = len(question_tokens & text_tokens) / len(question_tokens)
        if overlap > best_overlap:
            best_overlap = overlap

    return best_overlap


async def _fetch_keyword_candidates(question_texts: list[str], db: AsyncSession) -> list[tuple[Chunk, float]]:
    keywords = _extract_keywords(question_texts)
    if not keywords:
        return []

    conditions = [Chunk.chunk_text.ilike(f"%{keyword}%") for keyword in keywords]
    matched_chunks = (
        await db.execute(
            select(Chunk)
            .where(or_(*conditions))
            .limit(TOP_K_LEXICAL)
        )
    ).scalars().all()

    ranked_matches: list[tuple[Chunk, float]] = []
    for chunk in matched_chunks:
        keyword_overlap = _best_lexical_overlap(question_texts, chunk.chunk_text)
        if keyword_overlap <= 0:
            continue
        pseudo_distance = max(0.0, 1.0 - keyword_overlap)
        ranked_matches.append((chunk, pseudo_distance))

    ranked_matches.sort(key=lambda item: item[1])
    return ranked_matches


def _merge_rank_candidates(
    *,
    question_texts: list[str],
    query_candidates: Iterable[tuple[Chunk, float]],
    lexical_candidates: Iterable[tuple[Chunk, float]] | None = None,
    hyde_candidates: Iterable[tuple[Chunk, float]] | None = None,
) -> list[dict]:
    by_chunk_id: dict[int, dict] = {}

    def ensure_item(chunk: Chunk) -> dict:
        current = by_chunk_id.get(chunk.id)
        if current:
            return current
        current = {
            "chunk": chunk,
            "query_distance": 1.0,
            "hyde_distance": 1.0,
            "keyword_distance": 1.0,
            "lexical_overlap": _best_lexical_overlap(question_texts, chunk.chunk_text),
        }
        by_chunk_id[chunk.id] = current
        return current

    for chunk, distance in query_candidates:
        current = ensure_item(chunk)
        current["query_distance"] = min(current["query_distance"], distance)
        current["lexical_overlap"] = max(current["lexical_overlap"], _best_lexical_overlap(question_texts, chunk.chunk_text))

    if lexical_candidates:
        for chunk, distance in lexical_candidates:
            current = ensure_item(chunk)
            current["keyword_distance"] = min(current["keyword_distance"], distance)
            current["lexical_overlap"] = max(current["lexical_overlap"], _best_lexical_overlap(question_texts, chunk.chunk_text))

    if hyde_candidates:
        for chunk, distance in hyde_candidates:
            current = ensure_item(chunk)
            current["hyde_distance"] = min(current["hyde_distance"], distance)
            current["lexical_overlap"] = max(current["lexical_overlap"], _best_lexical_overlap(question_texts, chunk.chunk_text))

    ranked: list[dict] = []
    for item in by_chunk_id.values():
        vector_distance = (item["query_distance"] * EMBEDDING_BLEND_QUERY) + (item["hyde_distance"] * EMBEDDING_BLEND_HYDE)
        vector_similarity = max(0.0, 1.0 - vector_distance)
        keyword_similarity = max(0.0, 1.0 - item["keyword_distance"])
        rerank_score = (
            (vector_similarity * VECTOR_SCORE_WEIGHT)
            + (item["lexical_overlap"] * LEXICAL_WEIGHT)
            + (keyword_similarity * KEYWORD_WEIGHT)
        )
        ranked.append(
            {
                **item,
                "vector_distance": vector_distance,
                "keyword_similarity": keyword_similarity,
                "score": rerank_score,
            }
        )

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked


async def _rank_documents(question_texts: list[str], ranked_candidates: list[dict], db: AsyncSession) -> list[dict]:
    if not ranked_candidates:
        return []

    considered = ranked_candidates[: min(len(ranked_candidates), 56)]
    by_document_id: dict[int, list[dict]] = {}

    for item in considered:
        by_document_id.setdefault(item["chunk"].document_id, []).append(item)

    document_lookup = await _load_documents_for_chunks([item["chunk"] for item in considered], db)
    ranked_documents: list[dict] = []

    for document_id, items in by_document_id.items():
        items.sort(key=lambda candidate: candidate["score"], reverse=True)
        strongest_items = items[:4]
        best_score = strongest_items[0]["score"]
        avg_score = sum(candidate["score"] for candidate in strongest_items) / len(strongest_items)
        best_overlap = max(candidate["lexical_overlap"] for candidate in strongest_items)
        density_score = min(len(items), 5) / 5
        document = document_lookup.get(document_id)
        title_text = document.file_name if document else ""
        file_name_overlap = _best_lexical_overlap(question_texts, title_text)
        document_score = (
            (best_score * DOC_SCORE_TOP_WEIGHT)
            + (avg_score * DOC_SCORE_AVG_WEIGHT)
            + (best_overlap * DOC_SCORE_OVERLAP_WEIGHT)
            + (density_score * DOC_SCORE_COUNT_WEIGHT)
            + (file_name_overlap * DOC_SCORE_FILENAME_WEIGHT)
        )
        ranked_documents.append(
            {
                "document_id": document_id,
                "document": document,
                "score": document_score,
                "best_overlap": best_overlap,
                "candidate_count": len(items),
                "file_name_overlap": file_name_overlap,
            }
        )

    ranked_documents.sort(key=lambda item: item["score"], reverse=True)
    return ranked_documents


def _select_top_documents(ranked_documents: list[dict]) -> list[int]:
    if not ranked_documents:
        return []

    if len(ranked_documents) == 1:
        return [ranked_documents[0]["document_id"]]

    best_score = ranked_documents[0]["score"]
    second_score = ranked_documents[1]["score"]
    best_overlap = ranked_documents[0]["best_overlap"]
    second_overlap = ranked_documents[1]["best_overlap"]

    if best_score >= second_score * DOMINANT_DOC_SCORE_RATIO and best_overlap >= second_overlap + DOMINANT_DOC_OVERLAP_DELTA:
        return [ranked_documents[0]["document_id"]]

    score_floor = max(best_score * DOC_SELECTION_RATIO, best_score - DOC_SELECTION_DELTA)
    selected_document_ids: list[int] = []
    for index, item in enumerate(ranked_documents):
        if item["score"] < score_floor:
            continue
        if index > 0 and item["candidate_count"] < SECONDARY_DOC_MIN_CANDIDATES and item["file_name_overlap"] < SECONDARY_DOC_MIN_TITLE_OVERLAP:
            continue
        selected_document_ids.append(item["document_id"])
        if len(selected_document_ids) >= TOP_K_DOCS:
            break
    return selected_document_ids or [ranked_documents[0]["document_id"]]


def _should_use_hyde(ranked_candidates: list[dict]) -> bool:
    if not ranked_candidates:
        return True

    top_item = ranked_candidates[0]
    if top_item["vector_distance"] <= HYDE_TRIGGER_DISTANCE:
        return False
    if top_item["lexical_overlap"] >= HYDE_TRIGGER_OVERLAP:
        return False
    if top_item["keyword_similarity"] >= 0.5:
        return False
    return True


async def _select_context_chunks(
    ranked_candidates: list[dict],
    db: AsyncSession,
    allowed_document_ids: list[int] | None = None,
) -> list[Chunk]:
    doc_counts: dict[int, int] = {}
    filtered_candidates = [
        item for item in ranked_candidates if not allowed_document_ids or item["chunk"].document_id in allowed_document_ids
    ]
    if not filtered_candidates:
        filtered_candidates = ranked_candidates

    top_score = filtered_candidates[0]["score"] if filtered_candidates else 0.0
    minimum_score = max(CHUNK_SCORE_MIN, top_score * CHUNK_SCORE_RATIO)
    selected_anchors: list[Chunk] = []

    for item in filtered_candidates:
        chunk = item["chunk"]
        if len(selected_anchors) >= TOP_K_CONTEXT:
            break
        count = doc_counts.get(chunk.document_id, 0)
        if count >= MAX_ANCHOR_CHUNKS_PER_DOC:
            continue
        if item["score"] < minimum_score and len(selected_anchors) >= min(4, TOP_K_CONTEXT):
            continue
        doc_counts[chunk.document_id] = count + 1
        selected_anchors.append(chunk)

    if not selected_anchors:
        return []

    score_by_chunk_id = {item["chunk"].id: item["score"] for item in ranked_candidates}
    by_document_id: dict[int, list[Chunk]] = {}
    for chunk in selected_anchors:
        by_document_id.setdefault(chunk.document_id, []).append(chunk)

    expanded: list[Chunk] = []
    seen_chunk_ids: set[int] = set()

    ordered_documents = sorted(
        by_document_id.items(),
        key=lambda item: max(score_by_chunk_id.get(chunk.id, 0.0) for chunk in item[1]),
        reverse=True,
    )

    selected_anchor_ids = {anchor.id for anchor in selected_anchors}
    for document_id, chunks in ordered_documents:
        anchor_chunks = sorted(
            chunks,
            key=lambda chunk: score_by_chunk_id.get(chunk.id, 0.0),
            reverse=True,
        )[:MAX_ANCHOR_CHUNKS_PER_DOC]
        if not anchor_chunks:
            continue

        requested_indexes: set[int] = set()
        for anchor in anchor_chunks:
            start_index = max(0, anchor.chunk_index - NEIGHBOR_CHUNK_RADIUS)
            end_index = anchor.chunk_index + NEIGHBOR_CHUNK_RADIUS
            requested_indexes.update(range(start_index, end_index + 1))

        neighbor_chunks = (
            await db.execute(
                select(Chunk)
                .where(
                    Chunk.document_id == document_id,
                    Chunk.chunk_index.in_(sorted(requested_indexes)),
                )
                .order_by(Chunk.chunk_index.asc())
            )
        ).scalars().all()

        for chunk in neighbor_chunks:
            if chunk.id in seen_chunk_ids:
                continue
            if score_by_chunk_id.get(chunk.id, 0.0) < 0.05 and chunk.id not in selected_anchor_ids:
                continue
            seen_chunk_ids.add(chunk.id)
            expanded.append(chunk)

    if not expanded:
        return selected_anchors

    limited: list[Chunk] = []
    doc_counts = {}
    for chunk in expanded:
        if len(limited) >= TOP_K_CONTEXT:
            break
        count = doc_counts.get(chunk.document_id, 0)
        if count >= MAX_CHUNKS_PER_DOC:
            continue
        doc_counts[chunk.document_id] = count + 1
        limited.append(chunk)

    return limited or selected_anchors


async def _load_documents_for_chunks(chunks: list[Chunk], db: AsyncSession) -> dict[int, Document]:
    if not chunks:
        return {}
    document_ids = list({chunk.document_id for chunk in chunks})
    documents = (
        await db.execute(select(Document).where(Document.id.in_(document_ids)))
    ).scalars().all()
    return {document.id: document for document in documents}


async def _build_context(chunks: list[Chunk], db: AsyncSession) -> str:
    if not chunks:
        return ""

    documents = await _load_documents_for_chunks(chunks, db)
    sections = []
    ordered_chunks = sorted(chunks, key=lambda chunk: (chunk.document_id, chunk.chunk_index))
    for chunk in ordered_chunks:
        document = documents.get(chunk.document_id)
        title = document.file_name if document else f"Document {chunk.document_id}"
        sections.append(f"[Document: {title}]\n{chunk.chunk_text}")
    return "\n\n".join(sections)


def postprocess(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"#{1,6}\s*", "", text)
    return text


def _append_rag_log(record: dict) -> None:
    try:
        os.makedirs(RAG_LOG_DIR, exist_ok=True)
        log_name = f"{datetime.now().astimezone():%Y-%m-%d}.jsonl"
        log_path = os.path.join(RAG_LOG_DIR, log_name)
        with open(log_path, "a", encoding="utf-8") as log_file:
            log_file.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:
        logger.exception("failed to write rag log")


async def _build_sources(
    selected_chunks: list[Chunk],
    db: AsyncSession,
    score_by_chunk_id: dict[int, float] | None = None,
) -> list[dict]:
    if not selected_chunks:
        return []

    documents = await _load_documents_for_chunks(selected_chunks, db)
    score_lookup = score_by_chunk_id or {}
    best_chunk_by_doc: dict[int, Chunk] = {}

    for chunk in selected_chunks:
        current = best_chunk_by_doc.get(chunk.document_id)
        if current is None:
            best_chunk_by_doc[chunk.document_id] = chunk
            continue

        current_score = score_lookup.get(current.id, 0.0)
        next_score = score_lookup.get(chunk.id, 0.0)
        if next_score > current_score or (next_score == current_score and chunk.chunk_index < current.chunk_index):
            best_chunk_by_doc[chunk.document_id] = chunk

    ordered_docs = sorted(
        best_chunk_by_doc.items(),
        key=lambda item: (
            -score_lookup.get(item[1].id, 0.0),
            item[0],
        ),
    )

    sources: list[dict] = []
    for document_id, chunk in ordered_docs:
        document = documents.get(chunk.document_id)
        collapsed = " ".join(chunk.chunk_text.split())
        page_number = chunk.page_number
        source_id = f"doc-{document_id}-p-{page_number}" if page_number is not None else f"doc-{document_id}"
        sources.append(
            {
                "id": source_id,
                "documentId": chunk.document_id,
                "pageNumber": page_number,
                "title": document.file_name if document else f"Document {chunk.document_id}",
                "snippet": collapsed[:220] + ("..." if len(collapsed) > 220 else ""),
            }
        )

    return sources


def _prepare_history(history: list[dict], target_language: str) -> list[dict]:
    filtered = [item for item in history if item.get("role") in ALLOWED_ROLES and item.get("content")]
    return filtered[-MAX_HISTORY_MESSAGES:]


def _normalize_message_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _get_last_assistant_message(history: list[dict]) -> dict | None:
    for item in reversed(history):
        if item.get("role") == "assistant" and item.get("content"):
            return item
    return None


def _is_previous_answer_follow_up(question: str, history: list[dict]) -> bool:
    if not history or not _get_last_assistant_message(history):
        return False

    normalized = _normalize_message_text(question)
    if any(phrase in normalized for phrase in FOLLOW_UP_PREVIOUS_ANSWER_PHRASES):
        return True

    referential_terms = ("that", "it", "this", "previous", "last", "answer", "reply", "translate", "переведи", "ответ")
    return len(normalized) <= 160 and sum(term in normalized for term in referential_terms) >= 2


def _detect_requested_output_language(question: str, fallback_language: str) -> str:
    normalized = _normalize_message_text(question)
    for language, hints in OUTPUT_LANGUAGE_HINTS.items():
        if any(hint in normalized for hint in hints):
            return language
    return fallback_language


async def _answer_from_previous_exchange(question: str, history: list[dict], target_language: str) -> str:
    previous_turns = history[-4:]
    return postprocess(
        await _call_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "You are Mugallim AI, a legal helper for teachers.\n"
                        "The user is asking a follow-up about the immediately previous assistant answer.\n"
                        "Use the recent conversation to resolve references like 'that', 'previous answer', or 'what you said'.\n"
                        f"Answer in {target_language}.\n"
                        "Be direct, concise, and preserve the meaning of the previous answer."
                    ),
                },
                *previous_turns,
                {"role": "user", "content": question},
            ],
            temperature=0.2,
        )
    )


async def _answer(question: str, history: list[dict], target_language: str, context: str = "") -> str:
    use_context = bool(context)
    messages = [
        {
            "role": "system",
            "content": (
                f"{build_answer_system_prompt()}\n- Answer in {target_language}."
                if use_context
                else f"{build_small_talk_system_prompt()}\n- Answer in {target_language}."
            ),
        }
    ]
    messages.extend(history if use_context else history[-4:])
    messages.append(
        {
            "role": "user",
            "content": (
                f"Document context:\n{context}\n\nQuestion: {question}\n\nUse only supported facts from the context. Answer in {target_language}."
                if use_context
                else question
            ),
        }
    )
    return postprocess(await _call_chat(messages, temperature=0.1 if use_context else 0.4))





async def ask(question: str, user_id: int, platform: str, history: list[dict], db: AsyncSession) -> dict:
    prepared_history = _prepare_history(history, "dummy")
    follow_up_to_previous_answer = _is_previous_answer_follow_up(question, prepared_history)
    retrieval_history = [
        item.get("content", "").strip()
        for item in prepared_history
        if item.get("role") == "user" and item.get("content")
    ][-MAX_RETRIEVAL_HISTORY_MESSAGES:]
    retrieval_context = "\n".join(f"- {turn}" for turn in retrieval_history if turn)[:MAX_RETRIEVAL_CONTEXT_CHARS].rstrip()
    
    intent = "document_question"
    retrieval_queries = [question.strip()]
    target_language = "the same language as the user's question"
    detected_lang = "unknown"
    
    if follow_up_to_previous_answer:
        intent = "follow_up_previous_answer"
        detected_lang = detect_language(question)
        target_language = detected_lang if detected_lang != "unknown" else target_language
        target_language = _detect_requested_output_language(question, target_language)
    else:
        analysis = await analyze_question(question, retrieval_context)
        intent = analysis.get("intent", "document_question")
        detected_lang = analysis.get("language", "unknown")
        
        # Fallback to lingua if LLM failed to detect language
        if not detected_lang or detected_lang.lower() == "unknown":
            detected_lang = detect_language(question)
            
        target_language = detected_lang if detected_lang != "unknown" else "the same language as the user's question"
        retrieval_queries = analysis.get("queries", [question.strip()])
        if not retrieval_queries:
            retrieval_queries = [question.strip()]

    selected_chunks: list[Chunk] = []
    ranked_candidates: list[dict] = []
    ranked_documents: list[dict] = []
    used_hyde = False

    if follow_up_to_previous_answer:
        answer = await _answer_from_previous_exchange(question, prepared_history, target_language)
        sources = []
    elif intent == "small_talk":
        answer = await _answer(question, prepared_history, target_language)
        sources: list[dict] = []
    else:
        query_embeddings = await embed_chunks(retrieval_queries) if retrieval_queries else []

        query_candidates: list[tuple[Chunk, float]] = []
        for query_embedding in query_embeddings:
            query_candidates.extend(await _fetch_vector_candidates(query_embedding, db))

        lexical_candidates = await _fetch_keyword_candidates(retrieval_queries, db)
        ranked_candidates = _merge_rank_candidates(
            question_texts=retrieval_queries,
            query_candidates=query_candidates,
            lexical_candidates=lexical_candidates,
        )

        if _should_use_hyde(ranked_candidates):
            used_hyde = True
            hyde_text = await generate_hypothetical_answer(question, retrieval_context)
            hyde_embedding = await embed_text(hyde_text)
            hyde_candidates = await _fetch_vector_candidates(hyde_embedding, db)
            ranked_candidates = _merge_rank_candidates(
                question_texts=retrieval_queries,
                query_candidates=query_candidates,
                lexical_candidates=lexical_candidates,
                hyde_candidates=hyde_candidates,
            )

        ranked_documents = await _rank_documents(retrieval_queries, ranked_candidates, db)
        selected_document_ids = _select_top_documents(ranked_documents)
        selected_chunks = await _select_context_chunks(ranked_candidates, db, selected_document_ids)
        context = await _build_context(selected_chunks, db)
        answer = await _answer(question, prepared_history, target_language, context=context)
        ranked_score_by_chunk_id = {item["chunk"].id: item["score"] for item in ranked_candidates}
        sources = await _build_sources(selected_chunks, db, ranked_score_by_chunk_id)

    score_by_chunk_id = {item["chunk"].id: item["score"] for item in ranked_candidates}
    selected_documents = await _load_documents_for_chunks(selected_chunks, db) if selected_chunks else {}
    log_record = {
        "timestamp": datetime.now().astimezone().isoformat(),
        "platform": platform,
        "user_id": user_id,
        "question": question,
        "detected_language": detected_lang,
        "target_language": target_language,
        "intent": intent,
        "used_hyde": used_hyde,
        "retrieval_context": retrieval_context,
        "retrieval_queries": retrieval_queries,
        "history": prepared_history[-6:],
        "answer": answer,
        "sources": sources,
        "top_candidates": [
            {
                "chunk_id": item["chunk"].id,
                "document_id": item["chunk"].document_id,
                "chunk_index": item["chunk"].chunk_index,
                "page_number": item["chunk"].page_number,
                "document_title": next(
                    (
                        document_item["document"].file_name
                        for document_item in ranked_documents
                        if document_item["document_id"] == item["chunk"].document_id and document_item["document"]
                    ),
                    None,
                ),
                "score": round(float(item["score"]), 6),
                "vector_distance": round(float(item["vector_distance"]), 6),
                "lexical_overlap": round(float(item["lexical_overlap"]), 6),
                "keyword_similarity": round(float(item["keyword_similarity"]), 6),
                "text": item["chunk"].chunk_text,
            }
            for item in ranked_candidates[:12]
        ],
        "ranked_documents": [
            {
                "document_id": item["document_id"],
                "title": item["document"].file_name if item["document"] else f"Document {item['document_id']}",
                "score": round(float(item["score"]), 6),
                "best_overlap": round(float(item["best_overlap"]), 6),
                "candidate_count": item["candidate_count"],
                "file_name_overlap": round(float(item["file_name_overlap"]), 6),
            }
            for item in ranked_documents
        ],
        "selected_chunks": [
            {
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "document_title": selected_documents[chunk.document_id].file_name if chunk.document_id in selected_documents else f"Document {chunk.document_id}",
                "score": round(float(score_by_chunk_id.get(chunk.id, 0.0)), 6),
                "text": chunk.chunk_text,
            }
            for chunk in selected_chunks
        ],
    }
    await asyncio.to_thread(_append_rag_log, log_record)

    db.add(Message(user_id=user_id, platform=platform, question=question, answer=answer))
    await db.commit()
    logger.info(
        "rag=%s",
        {
            "question": question,
            "lang": detected_lang,
            "intent": intent,
            "hyde": used_hyde,
            "selected": len(selected_chunks),
            "top_distance": ranked_candidates[0]["vector_distance"] if ranked_candidates else None,
            "top_overlap": ranked_candidates[0]["lexical_overlap"] if ranked_candidates else None,
            "retrieval_queries": retrieval_queries,
            "docs": [
                {
                    "id": document["document_id"],
                    "score": document["score"],
                    "overlap": document["best_overlap"],
                    "candidates": document["candidate_count"],
                    "title": document["document"].file_name if document["document"] else f"Document {document['document_id']}",
                }
                for document in ranked_documents[:TOP_K_DOCS]
            ],
            "chunks": [{"id": chunk.id, "doc_id": chunk.document_id, "page_number": chunk.page_number} for chunk in selected_chunks],
        },
    )

    return {"answer": answer, "sources": sources}
