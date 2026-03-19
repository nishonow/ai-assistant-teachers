import logging
import re
from collections.abc import Iterable

from lingua import LanguageDetectorBuilder
from openai import OpenAI
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Chunk, Document, Message
from app.services.embeddings import embed_text
from app.services.rag_prompts import (
    HYDE_SYSTEM_PROMPT,
    INTENT_SYSTEM_PROMPT,
    LANGUAGE_MATCH_CHECK_SYSTEM_PROMPT,
    LANGUAGE_REWRITE_SYSTEM_PROMPT,
    RETRIEVAL_QUERY_SYSTEM_PROMPT,
    build_answer_system_prompt,
    build_small_talk_system_prompt,
)

logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.OPENAI_API_KEY)
detector = LanguageDetectorBuilder.from_all_languages().build()

CHAT_MODEL = "gpt-4o-mini"
EMBEDDING_BLEND_QUERY = 0.78
EMBEDDING_BLEND_HYDE = 0.22
VECTOR_SCORE_WEIGHT = 0.54
LEXICAL_WEIGHT = 0.28
KEYWORD_WEIGHT = 0.18
HYDE_TRIGGER_DISTANCE = 0.34
HYDE_TRIGGER_OVERLAP = 0.16
TOP_K_RETRIEVAL = 100
TOP_K_LEXICAL = 140
TOP_K_DOCS = 2
TOP_K_CONTEXT = 10
MAX_CHUNKS_PER_DOC = 4
MAX_ANCHOR_CHUNKS_PER_DOC = 2
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

ALLOWED_ROLES = {"user", "assistant"}
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
        script = _dominant_script(stripped)
        if script == "latin":
            return "English"
        if script == "cyrillic":
            return "Cyrillic"
        return "unknown"


def _call_chat(messages: list[dict], *, temperature: float = 0, max_tokens: int | None = None) -> str:
    payload = {
        "model": CHAT_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    response = client.chat.completions.create(**payload)
    return (response.choices[0].message.content or "").strip()


def classify_question_intent(question: str) -> str:
    try:
        label = _call_chat(
            [
                {"role": "system", "content": INTENT_SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0,
            max_tokens=8,
        ).lower()
    except Exception:
        logger.exception("intent classification failed; defaulting to document_question")
        return "document_question"

    return "small_talk" if "small_talk" in label else "document_question"


def generate_hypothetical_answer(question: str, retrieval_context: str = "") -> str:
    prompt = question if not retrieval_context else f"Current question:\n{question}\n\nRecent related context:\n{retrieval_context}"
    return _call_chat(
        [
            {
                "role": "system",
                "content": HYDE_SYSTEM_PROMPT,
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0,
    )


def _build_retrieval_queries(question: str, detected_lang: str, retrieval_context: str = "") -> list[str]:
    queries = [question.strip()]
    prompt = question if not retrieval_context else f"Current question:\n{question}\n\nRecent related context:\n{retrieval_context}"

    try:
        retrieval_query = _call_chat(
            [
                {"role": "system", "content": RETRIEVAL_QUERY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            max_tokens=64,
        ).strip()
    except Exception:
        logger.exception("retrieval query rewrite failed; using original question only")
        return queries

    if retrieval_query and retrieval_query.lower() != question.strip().lower():
        queries.append(retrieval_query)

    return queries


def _fetch_vector_candidates(embedding: list[float], db: Session) -> list[tuple[Chunk, float]]:
    return [
        (chunk, float(distance))
        for chunk, distance in (
            db.query(Chunk, Chunk.embedding.cosine_distance(embedding).label("distance"))
            .order_by(Chunk.embedding.cosine_distance(embedding))
            .limit(TOP_K_RETRIEVAL)
            .all()
        )
    ]


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


def _fetch_keyword_candidates(question_texts: list[str], db: Session) -> list[tuple[Chunk, float]]:
    keywords = _extract_keywords(question_texts)
    if not keywords:
        return []

    conditions = [Chunk.chunk_text.ilike(f"%{keyword}%") for keyword in keywords]
    matched_chunks = db.query(Chunk).filter(or_(*conditions)).limit(TOP_K_LEXICAL).all()

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


def _rank_documents(question_texts: list[str], ranked_candidates: list[dict], db: Session) -> list[dict]:
    if not ranked_candidates:
        return []

    considered = ranked_candidates[: min(len(ranked_candidates), 56)]
    by_document_id: dict[int, list[dict]] = {}

    for item in considered:
        by_document_id.setdefault(item["chunk"].document_id, []).append(item)

    document_lookup = _load_documents_for_chunks([item["chunk"] for item in considered], db)
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


def _select_context_chunks(ranked_candidates: list[dict], db: Session, allowed_document_ids: list[int] | None = None) -> list[Chunk]:
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
            db.query(Chunk)
            .filter(
                Chunk.document_id == document_id,
                Chunk.chunk_index.in_(sorted(requested_indexes)),
            )
            .order_by(Chunk.chunk_index.asc())
            .all()
        )

        for chunk in neighbor_chunks:
            if chunk.id in seen_chunk_ids:
                continue
            seen_chunk_ids.add(chunk.id)
            expanded.append(chunk)

    if not expanded:
        return selected_anchors

    limited: list[Chunk] = []
    doc_counts: dict[int, int] = {}
    for chunk in expanded:
        if len(limited) >= TOP_K_CONTEXT:
            break
        count = doc_counts.get(chunk.document_id, 0)
        if count >= MAX_CHUNKS_PER_DOC:
            continue
        doc_counts[chunk.document_id] = count + 1
        limited.append(chunk)

    return limited or selected_anchors


def _load_documents_for_chunks(chunks: list[Chunk], db: Session) -> dict[int, Document]:
    if not chunks:
        return {}
    document_ids = list({chunk.document_id for chunk in chunks})
    documents = db.query(Document).filter(Document.id.in_(document_ids)).all()
    return {document.id: document for document in documents}


def _build_context(chunks: list[Chunk], db: Session) -> str:
    if not chunks:
        return ""

    documents = _load_documents_for_chunks(chunks, db)
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


def _build_sources(selected_chunks: list[Chunk], db: Session) -> list[dict]:
    if not selected_chunks:
        return []

    documents = _load_documents_for_chunks(selected_chunks, db)
    sources: list[dict] = []
    seen_doc_ids: set[int] = set()

    for chunk in selected_chunks:
        if chunk.document_id in seen_doc_ids:
            continue
        seen_doc_ids.add(chunk.document_id)
        document = documents.get(chunk.document_id)
        collapsed = " ".join(chunk.chunk_text.split())
        sources.append(
            {
                "id": f"doc-{chunk.document_id}",
                "documentId": chunk.document_id,
                "title": document.file_name if document else f"Document {chunk.document_id}",
                "snippet": collapsed[:220] + ("..." if len(collapsed) > 220 else ""),
            }
        )

    return sources


def _prepare_history(history: list[dict], target_language: str) -> list[dict]:
    filtered = [item for item in history if item.get("role") in ALLOWED_ROLES and item.get("content")]
    recent = filtered[-MAX_HISTORY_MESSAGES:]
    if target_language == "unknown":
        return recent

    matching_language = [item for item in recent if detect_language(str(item.get("content", ""))) == target_language]
    return matching_language[-MAX_HISTORY_MESSAGES:] if matching_language else recent[-2:]


def _answer_small_talk(question: str, history: list[dict], target_language: str) -> str:
    messages = [{"role": "system", "content": f"{build_small_talk_system_prompt()}\n- Answer in {target_language}."}]
    messages.extend(history[-4:])
    messages.append({"role": "user", "content": question})
    return postprocess(_call_chat(messages, temperature=0.4))


def _answer_with_context(question: str, history: list[dict], context: str, target_language: str) -> str:
    messages = [
        {
            "role": "system",
            "content": f"{build_answer_system_prompt()}\n- Answer in {target_language}.",
        }
    ]
    messages.extend(history)

    user_content = (
        f"Document context:\n{context}\n\nQuestion: {question}\n\nUse only supported facts from the context. Answer in {target_language}."
        if context
        else f"{question}\n\nIf no relevant context is available, say so briefly in {target_language}."
    )
    messages.append({"role": "user", "content": user_content})
    return postprocess(_call_chat(messages, temperature=0.1))


def _rewrite_answer_in_language(answer: str, question: str, target_language: str) -> str:
    rewritten = _call_chat(
        [
            {"role": "system", "content": f"{LANGUAGE_REWRITE_SYSTEM_PROMPT}\n- Rewrite in {target_language}."},
            {
                "role": "user",
                "content": f"User question:\n{question}\n\nAnswer:\n{answer}",
            },
        ],
        temperature=0.1,
    )
    return postprocess(rewritten)


def _is_same_language(answer: str, question: str) -> bool:
    try:
        label = _call_chat(
            [
                {"role": "system", "content": LANGUAGE_MATCH_CHECK_SYSTEM_PROMPT},
                {"role": "user", "content": f"User question:\n{question}\n\nAssistant answer:\n{answer}"},
            ],
            temperature=0,
            max_tokens=4,
        ).strip().lower()
        return "same_language" in label
    except Exception:
        logger.exception("language match check failed; falling back to script comparison")
        return _has_same_script_family(question, answer)


def _dominant_script(text: str) -> str:
    counts = {"cyrillic": 0, "latin": 0}
    for char in text:
        if "А" <= char <= "я" or char in "Ёё":
            counts["cyrillic"] += 1
        elif ("A" <= char <= "Z") or ("a" <= char <= "z"):
            counts["latin"] += 1

    if counts["cyrillic"] == 0 and counts["latin"] == 0:
        return "other"
    return "cyrillic" if counts["cyrillic"] >= counts["latin"] else "latin"


def _has_same_script_family(question: str, answer: str) -> bool:
    question_script = _dominant_script(question)
    answer_script = _dominant_script(re.sub(r"<[^>]+>", " ", answer))
    if question_script == "other" or answer_script == "other":
        return True
    return question_script == answer_script


def _ensure_answer_language(answer: str, question: str, target_language: str) -> str:
    cleaned = answer.strip()
    if not cleaned:
        return cleaned

    if len(cleaned) > 48 and not _is_same_language(cleaned, question):
        try:
            return _rewrite_answer_in_language(cleaned, question, target_language)
        except Exception:
            logger.exception("answer rewrite failed; returning original answer")
            return cleaned

    return cleaned


def ask(question: str, user_id: int, platform: str, history: list[dict], db: Session) -> dict:
    detected_lang = detect_language(question)
    target_language = detected_lang if detected_lang != "unknown" else "the same language as the user's question"
    prepared_history = _prepare_history(history, detected_lang)
    retrieval_history = [
        item.get("content", "").strip()
        for item in prepared_history
        if item.get("role") == "user" and item.get("content")
    ][-MAX_RETRIEVAL_HISTORY_MESSAGES:]
    retrieval_context = "\n".join(f"- {turn}" for turn in retrieval_history if turn)[:MAX_RETRIEVAL_CONTEXT_CHARS].rstrip()
    intent = classify_question_intent(question)
    selected_chunks: list[Chunk] = []
    used_hyde = False

    if intent == "small_talk":
        answer = _ensure_answer_language(_answer_small_talk(question, prepared_history, target_language), question, target_language)
        sources: list[dict] = []
        logger.info("question=%r lang=%s intent=%s hyde=%s selected=%d", question, detected_lang, intent, used_hyde, 0)
    else:
        retrieval_queries = _build_retrieval_queries(question, detected_lang, retrieval_context)
        query_candidates: list[tuple[Chunk, float]] = []
        for retrieval_query in retrieval_queries:
            query_embedding = embed_text(retrieval_query)
            query_candidates.extend(_fetch_vector_candidates(query_embedding, db))
        lexical_candidates = _fetch_keyword_candidates(retrieval_queries, db)
        ranked_candidates = _merge_rank_candidates(
            question_texts=retrieval_queries,
            query_candidates=query_candidates,
            lexical_candidates=lexical_candidates,
        )

        if _should_use_hyde(ranked_candidates):
            used_hyde = True
            hyde_text = generate_hypothetical_answer(question, retrieval_context)
            hyde_embedding = embed_text(hyde_text)
            hyde_candidates = _fetch_vector_candidates(hyde_embedding, db)
            ranked_candidates = _merge_rank_candidates(
                question_texts=retrieval_queries,
                query_candidates=query_candidates,
                lexical_candidates=lexical_candidates,
                hyde_candidates=hyde_candidates,
            )

        ranked_documents = _rank_documents(retrieval_queries, ranked_candidates, db)
        selected_document_ids = _select_top_documents(ranked_documents)
        selected_chunks = _select_context_chunks(ranked_candidates, db, selected_document_ids)
        context = _build_context(selected_chunks, db)
        answer = _ensure_answer_language(
            _answer_with_context(question, prepared_history, context, target_language),
            question,
            target_language,
        )
        sources = _build_sources(selected_chunks, db)

        top_distance = ranked_candidates[0]["vector_distance"] if ranked_candidates else 1.0
        top_overlap = ranked_candidates[0]["lexical_overlap"] if ranked_candidates else 0.0
        logger.info(
            "question=%r lang=%s intent=%s hyde=%s selected=%d top_distance=%.4f top_overlap=%.4f retrieval_queries=%r",
            question,
            detected_lang,
            intent,
            used_hyde,
            len(selected_chunks),
            top_distance,
            top_overlap,
            retrieval_queries,
        )
        for document in ranked_documents[:TOP_K_DOCS]:
            title = document["document"].file_name if document["document"] else f"Document {document['document_id']}"
            logger.info(
                "  selected_doc id=%s score=%.4f overlap=%.4f candidates=%d title=%r",
                document["document_id"],
                document["score"],
                document["best_overlap"],
                document["candidate_count"],
                title,
            )
        for chunk in selected_chunks:
            logger.info("  context_chunk id=%s doc_id=%s", chunk.id, chunk.document_id)

    db.add(Message(user_id=user_id, platform=platform, question=question, answer=answer))
    db.commit()

    return {"answer": answer, "sources": sources}
