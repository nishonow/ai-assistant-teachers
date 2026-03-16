import re
import logging
from sqlalchemy.orm import Session
from openai import OpenAI
from lingua import LanguageDetectorBuilder
from app.config import settings
from app.models import Chunk, Message, Document
from app.services.embeddings import embed_text

logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.OPENAI_API_KEY)
detector = LanguageDetectorBuilder.from_all_languages().build()

SYSTEM_PROMPT = """You are Mugallim AI, an AI assistant that answers questions based on uploaded documents.

RULES:
- Answer questions using the provided document context
- For greetings, small talk, questions about yourself: answer naturally and briefly
- If context is partially relevant, provide the best answer from closest passages; use "I don't have..." only when context is clearly unrelated or empty.
- Do not fabricate specific laws, articles, or rules that are not in the context

FORMATTING — STRICT RULES:
- Use ONLY HTML tags. Never use markdown under any circumstances
- Forbidden: **bold**, *italic*, # headers, numbered lists with dots, --- separators
- Allowed: <b>term</b> for key terms, - for bullet points
- Structure: one short paragraph first, then bullet points only if needed
- Never start with "According to", "Based on", "The documents state" or similar phrases"""

ALLOWED_ROLES = {"user", "assistant"}
TOP_K_RETRIEVAL = 100
TOP_K_CONTEXT = 10
MAX_CHUNKS_PER_DOC = 3


def detect_language(question: str) -> str:
    if len(question.strip()) < 10:
        return "Russian"
    lang = detector.detect_language_of(question)
    return lang.name.capitalize() if lang else "Russian"


def generate_hypothetical_answer(question: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Generate a short hypothetical document passage that would answer the following question. Write it as if extracted from an official policy or legal document. 2-3 sentences max. No preamble."
            },
            {"role": "user", "content": question}
        ],
        temperature=0
    )
    return response.choices[0].message.content.strip()


def search_chunks(query: str, hyde_text: str, db: Session) -> list[tuple[Chunk, float]]:
    query_embedding = embed_text(query)
    hyde_embedding = embed_text(hyde_text)

    query_scores: dict[int, tuple[Chunk, float]] = {}
    hyde_scores: dict[int, tuple[Chunk, float]] = {}

    for chunk, distance in (
        db.query(Chunk, Chunk.embedding.cosine_distance(query_embedding).label("distance"))
        .order_by(Chunk.embedding.cosine_distance(query_embedding))
        .limit(TOP_K_RETRIEVAL)
        .all()
    ):
        query_scores[chunk.id] = (chunk, float(distance))

    for chunk, distance in (
        db.query(Chunk, Chunk.embedding.cosine_distance(hyde_embedding).label("distance"))
        .order_by(Chunk.embedding.cosine_distance(hyde_embedding))
        .limit(TOP_K_RETRIEVAL)
        .all()
    ):
        hyde_scores[chunk.id] = (chunk, float(distance))

    all_chunk_ids = set(query_scores.keys()) | set(hyde_scores.keys())

    scored: list[tuple[Chunk, float]] = []
    for chunk_id in all_chunk_ids:
        if chunk_id in query_scores:
            chunk, d_query = query_scores[chunk_id]
        else:
            chunk, _ = hyde_scores[chunk_id]
            d_query = 1.0

        d_hyde = hyde_scores[chunk_id][1] if chunk_id in hyde_scores else 1.0
        combined = 0.7 * d_query + 0.3 * d_hyde
        scored.append((chunk, combined))

    scored.sort(key=lambda x: x[1])

    doc_counts: dict[int, int] = {}
    final: list[tuple[Chunk, float]] = []
    for chunk, score in scored:
        if len(final) >= TOP_K_CONTEXT:
            break
        count = doc_counts.get(chunk.document_id, 0)
        if count >= MAX_CHUNKS_PER_DOC:
            continue
        doc_counts[chunk.document_id] = count + 1
        final.append((chunk, score))

    return final


def postprocess(text: str) -> str:
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'#{1,6}\s*', '', text)
    return text


def ask(question: str, user_id: int, platform: str, history: list[dict], db: Session) -> dict:
    detected_lang = detect_language(question)
    hyde_text = generate_hypothetical_answer(question)
    scored_chunks = search_chunks(question, hyde_text, db)

    logger.info(
        "question=%r lang=%s chunks=%d top_score=%.4f",
        question, detected_lang, len(scored_chunks),
        scored_chunks[0][1] if scored_chunks else 1.0
    )
    for chunk, score in scored_chunks:
        logger.info("  chunk_id=%s doc_id=%s score=%.4f", chunk.id, chunk.document_id, score)

    messages = [
        {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\nCRITICAL: You MUST respond in {detected_lang} only. No exceptions."
        }
    ]

    for msg in [m for m in history if m.get("role") in ALLOWED_ROLES]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    context = "\n\n".join([chunk.chunk_text for chunk, _ in scored_chunks]) if scored_chunks else ""
    user_content = (
        f"Document context:\n{context}\n\nQuestion: {question}\n\nRemember: respond in {detected_lang}."
        if context else
        f"{question}\n\nRemember: respond in {detected_lang}."
    )
    messages.append({"role": "user", "content": user_content})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.2
    )

    answer = postprocess(response.choices[0].message.content)

    sources = {}
    if scored_chunks:
        top_score = scored_chunks[0][1]
        ordered_doc_ids = []
        seen: set[int] = set()
        for chunk, score in scored_chunks:
            if score <= top_score + 0.03 and chunk.document_id not in seen:
                seen.add(chunk.document_id)
                ordered_doc_ids.append(chunk.document_id)

        if ordered_doc_ids:
            docs = db.query(Document).filter(Document.id.in_(ordered_doc_ids)).all()
            by_id = {doc.id: doc.file_name for doc in docs}
            sources = {doc_id: by_id[doc_id] for doc_id in ordered_doc_ids if doc_id in by_id}

    db.add(Message(user_id=user_id, platform=platform, question=question, answer=answer))
    db.commit()

    return {"answer": answer, "sources": sources}