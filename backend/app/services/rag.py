from sqlalchemy.orm import Session
from openai import OpenAI
from lingua import LanguageDetectorBuilder
from app.config import settings
from app.models import Chunk, Message, Document
from app.services.embeddings import embed_text

client = OpenAI(api_key=settings.OPENAI_API_KEY)

detector = LanguageDetectorBuilder.from_all_languages().build()

SYSTEM_PROMPT = """You are Mugallim AI, a legal assistant for teachers in Kyrgyzstan.
You help teachers understand their rights based on labor law documents.

ANSWER RULES:
- For legal questions: answer ONLY from the provided document context
- For greetings, small talk, questions about yourself: answer naturally and briefly
- For questions about chat history: use the provided chat history to answer
- If legal question is not in context: say you don't have that information in the documents
- Never say "I can't answer" for non-legal questions

STYLE:
- Answer directly, never use meta phrases like "according to the documents", "based on the context"
- Use <b> for key terms. First short text then use - for bullet points when necessary. No markdown."""


def detect_language(question: str) -> str:
    lang = detector.detect_language_of(question)
    return lang.name.capitalize() if lang else "Russian"

def search_chunks(query: str, db: Session, top_k: int = 5) -> list[Chunk]:
    query_embedding = embed_text(query)
    return db.query(Chunk).order_by(
        Chunk.embedding.cosine_distance(query_embedding)
    ).limit(top_k).all()


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
    user_content = f"Document context:\n{context}\n\nQuestion: {question}\n\nRemember: respond in {detected_lang}." if context else f"{question}\n\nRemember: respond in {detected_lang}."

    messages.append({"role": "user", "content": user_content})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.2
    )

    answer = response.choices[0].message.content

    sources = {}
    for chunk in chunks:
        if chunk.document_id not in sources:
            doc = db.query(Document).filter(Document.id == chunk.document_id).first()
            if doc:
                sources[chunk.document_id] = doc.file_name

    db.add(Message(user_id=user_id, platform=platform, question=question))
    db.commit()

    return {"answer": answer, "sources": sources}