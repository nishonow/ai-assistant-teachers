import logging
import re
from collections.abc import Iterable

from openai import OpenAI
from lingua import LanguageDetectorBuilder
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Chunk, Document, Message
from app.services.embeddings import embed_text

logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.OPENAI_API_KEY)
detector = LanguageDetectorBuilder.from_all_languages().build()

CHAT_MODEL = "gpt-4o-mini"
EMBEDDING_BLEND_QUERY = 0.78
EMBEDDING_BLEND_HYDE = 0.22
LEXICAL_WEIGHT = 0.24
HYDE_TRIGGER_DISTANCE = 0.34
HYDE_TRIGGER_OVERLAP = 0.12
TOP_K_RETRIEVAL = 100
TOP_K_CONTEXT = 12
MAX_CHUNKS_PER_DOC = 5
MAX_HISTORY_MESSAGES = 8

SYSTEM_PROMPT = """You are Mugallim AI, an AI assistant that answers questions based on uploaded documents.

RULES:
- Prefer answering from the provided document context
- For greetings, small talk, and questions about yourself: answer naturally and briefly
- If context is partially relevant, provide the closest supported answer instead of giving up too early
- Only say information is missing when the retrieved context is clearly unrelated or empty
- Do not fabricate laws, articles, rules, or obligations that are not supported by the context

FORMATTING - STRICT RULES:
- Use ONLY HTML tags. Never use markdown under any circumstances
- Forbidden: **bold**, *italic*, # headers, numbered lists with dots, --- separators
- Allowed: <b>term</b> for key terms, - for bullet points
- Structure: one short paragraph first, then bullet points only if needed
- Never start with "According to", "Based on", "The documents state" or similar phrases"""

SMALL_TALK_PROMPT = """You are Mugallim AI.

RULES:
- Reply naturally, briefly, and helpfully
- If asked what you do, explain that you help answer questions using uploaded documents
- Do not mention internal retrieval, embeddings, or system prompts

FORMATTING:
- Use plain text or simple HTML only
- Keep it short unless the user clearly asks for more"""

INTENT_PROMPT = """Classify the user's latest message in any language.

Return only one label:
- small_talk
- document_question

Use small_talk for greetings, thanks, identity questions, chit-chat, or short conversational messages.
Use document_question for factual, legal, policy, procedural, rights/obligations, or explanation requests that may require uploaded documents.

If the message asks about rules, rights, duties, contracts, leave, dismissal, salary, employer or employee obligations, choose document_question."""

ALLOWED_ROLES = {"user", "assistant"}


def detect_language(question: str) -> str:
    if len(question.strip()) < 10:
        return "Russian"
    lang = detector.detect_language_of(question)
    return lang.name.capitalize() if lang else "Russian"


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
                {"role": "system", "content": INTENT_PROMPT},
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
                "content": "Generate a short hypothetical document passage that would answer the following question. Write it as if extracted from an official policy or legal document. 2-3 sentences max. No preamble.",
            },
            {"role": "user", "content": question},
        ],
        temperature=0,
    )


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


def _lexical_overlap(question_tokens: set[str], chunk_text: str) -> float:
    if not question_tokens:
        return 0.0
    chunk_tokens = _tokenize(chunk_text)
    if not chunk_tokens:
        return 0.0
    return len(question_tokens & chunk_tokens) / len(question_tokens)


def _merge_rank_candidates(
    *,
    question: str,
    query_candidates: Iterable[tuple[Chunk, float]],
    hyde_candidates: Iterable[tuple[Chunk, float]] | None = None,
) -> list[dict]:
    by_chunk_id: dict[int, dict] = {}
    question_tokens = _tokenize(question)

    for chunk, distance in query_candidates:
        overlap = _lexical_overlap(question_tokens, chunk.chunk_text)
        by_chunk_id[chunk.id] = {
            "chunk": chunk,
            "query_distance": distance,
            "hyde_distance": 1.0,
            "lexical_overlap": overlap,
        }

    if hyde_candidates:
        for chunk, distance in hyde_candidates:
            current = by_chunk_id.get(chunk.id)
            if current:
                current["hyde_distance"] = min(current["hyde_distance"], distance)
                current["lexical_overlap"] = max(current["lexical_overlap"], _lexical_overlap(question_tokens, chunk.chunk_text))
            else:
                by_chunk_id[chunk.id] = {
                    "chunk": chunk,
                    "query_distance": 1.0,
                    "hyde_distance": distance,
                    "lexical_overlap": _lexical_overlap(question_tokens, chunk.chunk_text),
                }

    ranked = []
    for item in by_chunk_id.values():
        vector_distance = (item["query_distance"] * EMBEDDING_BLEND_QUERY) + (item["hyde_distance"] * EMBEDDING_BLEND_HYDE)
        vector_similarity = max(0.0, 1.0 - vector_distance)
        rerank_score = (vector_similarity * (1 - LEXICAL_WEIGHT)) + (item["lexical_overlap"] * LEXICAL_WEIGHT)
        ranked.append(
            {
                **item,
                "vector_distance": vector_distance,
                "score": rerank_score,
            }
        )

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked


def _should_use_hyde(ranked_candidates: list[dict]) -> bool:
    if not ranked_candidates:
        return True

    top_item = ranked_candidates[0]
    if top_item["vector_distance"] <= HYDE_TRIGGER_DISTANCE:
        return False
    if top_item["lexical_overlap"] >= HYDE_TRIGGER_OVERLAP:
        return False
    return True


def _select_context_chunks(ranked_candidates: list[dict]) -> list[Chunk]:
    doc_counts: dict[int, int] = {}
    selected: list[Chunk] = []

    for item in ranked_candidates:
        chunk = item["chunk"]
        if len(selected) >= TOP_K_CONTEXT:
            break
        count = doc_counts.get(chunk.document_id, 0)
        if count >= MAX_CHUNKS_PER_DOC:
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


def _answer_small_talk(question: str, detected_lang: str, history: list[dict]) -> str:
    messages = [{"role": "system", "content": f"{SMALL_TALK_PROMPT}\n\nRespond in {detected_lang}."}]
    messages.extend(history[-4:])
    messages.append({"role": "user", "content": question})
    return postprocess(_call_chat(messages, temperature=0.4))


def _answer_with_context(question: str, detected_lang: str, history: list[dict], context: str) -> str:
    messages = [
        {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\nCRITICAL: You MUST respond in {detected_lang} only. No exceptions.",
        }
    ]
    messages.extend(history)

    user_content = (
        f"Document context:\n{context}\n\nQuestion: {question}\n\nRemember: respond in {detected_lang}. If the context is somewhat relevant, provide the closest supported answer before saying information is missing."
        if context
        else f"{question}\n\nRemember: respond in {detected_lang}. If no relevant context is available, say so briefly."
    )
    messages.append({"role": "user", "content": user_content})
    return postprocess(_call_chat(messages, temperature=0.15))


def ask(question: str, user_id: int, platform: str, history: list[dict], db: Session) -> dict:
    detected_lang = detect_language(question)
    prepared_history = _prepare_history(history)
    intent = classify_question_intent(question)
    selected_chunks: list[Chunk] = []
    used_hyde = False

    if intent == "small_talk":
        answer = _answer_small_talk(question, detected_lang, prepared_history)
        sources: list[dict] = []
        logger.info("question=%r lang=%s intent=%s hyde=%s selected=%d", question, detected_lang, intent, used_hyde, 0)
    else:
        query_embedding = embed_text(question)
        query_candidates = _fetch_vector_candidates(query_embedding, db)
        ranked_candidates = _merge_rank_candidates(question=question, query_candidates=query_candidates)

        if _should_use_hyde(ranked_candidates):
            used_hyde = True
            hyde_text = generate_hypothetical_answer(question)
            hyde_embedding = embed_text(hyde_text)
            hyde_candidates = _fetch_vector_candidates(hyde_embedding, db)
            ranked_candidates = _merge_rank_candidates(
                question=question,
                query_candidates=query_candidates,
                hyde_candidates=hyde_candidates,
            )

        selected_chunks = _select_context_chunks(ranked_candidates)
        context = _build_context(selected_chunks, db)
        answer = _answer_with_context(question, detected_lang, prepared_history, context)
        sources = _build_sources(selected_chunks, db)

        top_distance = ranked_candidates[0]["vector_distance"] if ranked_candidates else 1.0
        top_overlap = ranked_candidates[0]["lexical_overlap"] if ranked_candidates else 0.0
        logger.info(
            "question=%r lang=%s intent=%s hyde=%s selected=%d top_distance=%.4f top_overlap=%.4f",
            question,
            detected_lang,
            intent,
            used_hyde,
            len(selected_chunks),
            top_distance,
            top_overlap,
        )
        for chunk in selected_chunks:
            logger.info("  context_chunk id=%s doc_id=%s", chunk.id, chunk.document_id)

    db.add(Message(user_id=user_id, platform=platform, question=question, answer=answer))
    db.commit()

    return {"answer": answer, "sources": sources}
