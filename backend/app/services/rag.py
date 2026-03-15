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


def search_chunks(query: str, db: Session, top_k: int = 12) -> list[Chunk]:
    query_embedding = embed_text(query)
    return (
        db.query(Chunk)
        .order_by(Chunk.embedding.cosine_distance(query_embedding))
        .limit(top_k)
        .all()
    )


def postprocess(text: str) -> str:
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'#{1,6}\s*', '', text)
    return text


def ask(question: str, user_id: int, platform: str, history: list[dict], db: Session) -> dict:
    detected_lang = detect_language(question)

    messages = [
        {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\nCRITICAL: You MUST respond in {detected_lang} only. No exceptions."
        }
    ]

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    chunks = search_chunks(question, db)
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