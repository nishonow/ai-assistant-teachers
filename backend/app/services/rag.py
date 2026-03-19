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
HYDE_TRIGGER_OVERLAP = 0.12
TOP_K_RETRIEVAL = 100
TOP_K_LEXICAL = 140
TOP_K_DOCS = 2
TOP_K_CONTEXT = 10
MAX_CHUNKS_PER_DOC = 4
MAX_HISTORY_MESSAGES = 8
DOC_SCORE_TOP_WEIGHT = 0.48
DOC_SCORE_AVG_WEIGHT = 0.18
DOC_SCORE_OVERLAP_WEIGHT = 0.14
DOC_SCORE_COUNT_WEIGHT = 0.08
DOC_SCORE_FILENAME_WEIGHT = 0.12
DOC_SELECTION_RATIO = 0.62
DOC_SELECTION_DELTA = 0.14
CHUNK_SCORE_RATIO = 0.58
CHUNK_SCORE_MIN = 0.18
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

    cyrillic_count = sum(1 for char in stripped if "А" <= char <= "я" or char in "Ёё")
    latin_count = sum(1 for char in stripped if ("A" <= char <= "Z") or ("a" <= char <= "z"))

    if cyrillic_count >= max(6, latin_count * 2):
        russian_markers = {"как", "или", "для", "это", "при", "что", "кто", "где", "если", "есть"}
        lowered_tokens = _tokenize(stripped)
        return "Russian" if lowered_tokens & russian_markers else "Cyrillic"

    if latin_count >= max(6, cyrillic_count * 2):
        return "Latin"

    try:
        lang = detector.detect_language_of(stripped)
        return lang.name.capitalize() if lang else "unknown"
    except Exception:
        logger.exception("language detection failed; using unknown")
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


def generate_hypothetical_answer(question: str) -> str:
    return _call_chat(
        [
            {
                "role": "system",
                "content": HYDE_SYSTEM_PROMPT,
            },
            {"role": "user", "content": question},
        ],
        temperature=0,
    )


def _build_retrieval_queries(question: str, detected_lang: str) -> list[str]:
    queries = [question.strip()]

    if detected_lang == "Russian":
        return queries

    try:
        retrieval_query = _call_chat(
            [
                {"role": "system", "content": RETRIEVAL_QUERY_SYSTEM_PROMPT},
                {"role": "user", "content": question},
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


def _lexical_overlap(question_tokens: set[str], text: str) -> float:
    if not question_tokens:
        return 0.0
    text_tokens = _tokenize(text)
    if not text_tokens:
        return 0.0
    return len(question_tokens & text_tokens) / len(question_tokens)


def _max_lexical_overlap(question_texts: list[str], text: str) -> float:
    if not question_texts:
        return 0.0
    return max(_lexical_overlap(_tokenize(question_text), text) for question_text in question_texts)


def _fetch_keyword_candidates(question_texts: list[str], db: Session) -> list[tuple[Chunk, float]]:
    keywords = _extract_keywords(question_texts)
    if not keywords:
        return []

    conditions = [Chunk.chunk_text.ilike(f"%{keyword}%") for keyword in keywords]
    matched_chunks = db.query(Chunk).filter(or_(*conditions)).limit(TOP_K_LEXICAL).all()

    ranked_matches: list[tuple[Chunk, float]] = []
    for chunk in matched_chunks:
        keyword_overlap = _max_lexical_overlap(question_texts, chunk.chunk_text)
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
            "lexical_overlap": _max_lexical_overlap(question_texts, chunk.chunk_text),
        }
        by_chunk_id[chunk.id] = current
        return current

    for chunk, distance in query_candidates:
        current = ensure_item(chunk)
        current["query_distance"] = min(current["query_distance"], distance)
        current["lexical_overlap"] = max(current["lexical_overlap"], _max_lexical_overlap(question_texts, chunk.chunk_text))

    if lexical_candidates:
        for chunk, distance in lexical_candidates:
            current = ensure_item(chunk)
            current["keyword_distance"] = min(current["keyword_distance"], distance)
            current["lexical_overlap"] = max(current["lexical_overlap"], _max_lexical_overlap(question_texts, chunk.chunk_text))

    if hyde_candidates:
        for chunk, distance in hyde_candidates:
            current = ensure_item(chunk)
            current["hyde_distance"] = min(current["hyde_distance"], distance)
            current["lexical_overlap"] = max(current["lexical_overlap"], _max_lexical_overlap(question_texts, chunk.chunk_text))

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
        file_name_overlap = _max_lexical_overlap(question_texts, title_text)
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
    selected_document_ids = [item["document_id"] for item in ranked_documents if item["score"] >= score_floor][:TOP_K_DOCS]
    return selected_document_ids or [ranked_documents[0]["document_id"]]


def _should_use_hyde(ranked_candidates: list[dict]) -> bool:
    if not ranked_candidates:
        return True

    top_item = ranked_candidates[0]
    if top_item["vector_distance"] <= HYDE_TRIGGER_DISTANCE:
        return False
    if top_item["lexical_overlap"] >= HYDE_TRIGGER_OVERLAP:
        return False
    if top_item["keyword_similarity"] >= 0.42:
        return False
    return True


def _select_context_chunks(ranked_candidates: list[dict], allowed_document_ids: list[int] | None = None) -> list[Chunk]:
    doc_counts: dict[int, int] = {}
    selected: list[Chunk] = []
    filtered_candidates = [
        item for item in ranked_candidates if not allowed_document_ids or item["chunk"].document_id in allowed_document_ids
    ]
    if not filtered_candidates:
        filtered_candidates = ranked_candidates

    top_score = filtered_candidates[0]["score"] if filtered_candidates else 0.0
    minimum_score = max(CHUNK_SCORE_MIN, top_score * CHUNK_SCORE_RATIO)

    for item in filtered_candidates:
        chunk = item["chunk"]
        if len(selected) >= TOP_K_CONTEXT:
            break
        count = doc_counts.get(chunk.document_id, 0)
        if count >= MAX_CHUNKS_PER_DOC:
            continue
        if item["score"] < minimum_score and len(selected) >= min(4, TOP_K_CONTEXT):
            continue
        doc_counts[chunk.document_id] = count + 1
        selected.append(chunk)

    return selected


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
    for chunk in chunks:
        document = documents.get(chunk.document_id)
        title = document.file_name if document else f"Document {chunk.document_id}"
        sections.append(f"[Document: {title}]\n{chunk.chunk_text}")
    return "\n\n".join(sections)


def postprocess(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"#{1,6}\s*", "", text)
    return text


def _clean_snippet(text: str) -> str:
    collapsed = " ".join(text.split())
    return collapsed[:220] + ("..." if len(collapsed) > 220 else "")


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
        sources.append(
            {
                "id": f"doc-{chunk.document_id}",
                "documentId": chunk.document_id,
                "title": document.file_name if document else f"Document {chunk.document_id}",
                "snippet": _clean_snippet(chunk.chunk_text),
            }
        )

    return sources


def _prepare_history(history: list[dict]) -> list[dict]:
    filtered = [item for item in history if item.get("role") in ALLOWED_ROLES and item.get("content")]
    return filtered[-MAX_HISTORY_MESSAGES:]


def _answer_small_talk(question: str, history: list[dict]) -> str:
    messages = [{"role": "system", "content": build_small_talk_system_prompt()}]
    messages.extend(history[-4:])
    messages.append({"role": "user", "content": question})
    return postprocess(_call_chat(messages, temperature=0.4))


def _answer_with_context(question: str, history: list[dict], context: str) -> str:
    messages = [
        {
            "role": "system",
            "content": build_answer_system_prompt(),
        }
    ]
    messages.extend(history)

    user_content = (
        f"Document context:\n{context}\n\nQuestion: {question}\n\nUse only supported facts from the context and answer in the same language as the question."
        if context
        else f"{question}\n\nIf no relevant context is available, say so briefly in the same language as the question."
    )
    messages.append({"role": "user", "content": user_content})
    return postprocess(_call_chat(messages, temperature=0.1))


def _rewrite_answer_in_language(answer: str, question: str) -> str:
    rewritten = _call_chat(
        [
            {"role": "system", "content": LANGUAGE_REWRITE_SYSTEM_PROMPT},
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


def _ensure_answer_language(answer: str, question: str) -> str:
    cleaned = answer.strip()
    if not cleaned:
        return cleaned

    if len(cleaned) > 48 and not _is_same_language(cleaned, question):
        try:
            return _rewrite_answer_in_language(cleaned, question)
        except Exception:
            logger.exception("answer rewrite failed; returning original answer")
            return cleaned

    return cleaned


def ask(question: str, user_id: int, platform: str, history: list[dict], db: Session) -> dict:
    detected_lang = detect_language(question)
    prepared_history = _prepare_history(history)
    intent = classify_question_intent(question)
    selected_chunks: list[Chunk] = []
    used_hyde = False

    if intent == "small_talk":
        answer = _ensure_answer_language(_answer_small_talk(question, prepared_history), question)
        sources: list[dict] = []
        logger.info("question=%r lang=%s intent=%s hyde=%s selected=%d", question, detected_lang, intent, used_hyde, 0)
    else:
        retrieval_queries = _build_retrieval_queries(question, detected_lang)
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
            hyde_text = generate_hypothetical_answer(question)
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
        selected_chunks = _select_context_chunks(ranked_candidates, selected_document_ids)
        context = _build_context(selected_chunks, db)
        answer = _ensure_answer_language(_answer_with_context(question, prepared_history, context), question)
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
