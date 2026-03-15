import re
from sqlalchemy.orm import Session
from openai import OpenAI
from lingua import LanguageDetectorBuilder
from app.config import settings
from app.models import Chunk, Message, Document
from app.services.embeddings import embed_text

client = OpenAI(api_key=settings.OPENAI_API_KEY)
detector = LanguageDetectorBuilder.from_all_languages().build()

SYSTEM_PROMPT = """You are Mugallim AI, an AI assistant that answers questions based on uploaded documents.

RULES:
- For questions answerable from the document context: answer ONLY from the context, never from your own knowledge
- For greetings, small talk, questions about yourself: answer naturally and briefly, ignore the context
- If the question is document-related but the answer is not in the context: say "I don't have that information in the documents"
- Never fabricate information not present in the context

FORMATTING — STRICT RULES:
- Use ONLY HTML tags. Never use markdown under any circumstances
- Forbidden: **bold**, *italic*, # headers, numbered lists with dots, --- separators
- Allowed: <b>term</b> for key terms, - for bullet points
- Structure: one short paragraph first, then bullet points only if needed
- Never start with "According to", "Based on", "The documents state" or similar phrases"""


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
                "content": "Generate a short hypothetical document passage that would answer the following question. Write it as if it's extracted from an official policy or legal document. 2-3 sentences max. No preamble."
            },
            {"role": "user", "content": question}
        ],
        temperature=0
    )
    return response.choices[0].message.content.strip()


def search_chunks(query: str, hyde_text: str, db: Session, top_k_per_doc: int = 4) -> list[Chunk]:
    query_embedding = embed_text(query)
    hyde_embedding = embed_text(hyde_text)

    document_ids = [
        row[0] for row in db.query(Document.id).filter(Document.status == "indexed").all()
    ]

    seen_ids = set()
    results = []

    for doc_id in document_ids:
        for embedding in [query_embedding, hyde_embedding]:
            chunks = (
                db.query(Chunk)
                .filter(Chunk.document_id == doc_id)
                .order_by(Chunk.embedding.cosine_distance(embedding))
                .limit(top_k_per_doc)
                .all()
            )
            for chunk in chunks:
                if chunk.id not in seen_ids:
                    seen_ids.add(chunk.id)
                    results.append(chunk)

    return results


def postprocess(text: str) -> str:
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'#{1,6}\s*', '', text)
    return text


def ask(question: str, user_id: int, platform: str, history: list[dict], db: Session) -> dict:
    detected_lang = detect_language(question)
    hyde_text = generate_hypothetical_answer(question)
    chunks = search_chunks(question, hyde_text, db)

    messages = [
        {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\nCRITICAL: You MUST respond in {detected_lang} only. No exceptions."
        }
    ]

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    context = "\n\n".join([chunk.chunk_text for chunk in chunks]) if chunks else ""
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
    for chunk in chunks:
        if chunk.document_id not in sources:
            doc = db.query(Document).filter(Document.id == chunk.document_id).first()
            if doc:
                sources[chunk.document_id] = doc.file_name

    db.add(Message(user_id=user_id, platform=platform, question=question, answer=answer))
    db.commit()

    return {"answer": answer, "sources": sources}