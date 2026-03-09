from sqlalchemy.orm import Session
from openai import OpenAI
from app.config import settings
from app.models import Chunk, Message
from app.services.embeddings import embed_text

client = OpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are a legal assistant for teachers in Kyrgyzstan.
Answer only based on the provided context from labor law documents.
If the answer is not in the context, honestly say so.
IMPORTANT: You MUST detect the language of the user's question and respond in THAT EXACT language.
If the question is in English, respond in English.
If the question is in Russian, respond in Russian.
If the question is in Kyrgyz, respond in Kyrgyz.
Do NOT default to Russian under any circumstances.
Format your response for Telegram HTML: use <b> for key terms. Use - for bullet points.
Do not use Markdown syntax like **bold** or numbered markdown lists."""

def search_chunks(query: str, db: Session, top_k: int = 5) -> list[Chunk]:
    query_embedding = embed_text(query)
    chunks = db.query(Chunk).order_by(
        Chunk.embedding.cosine_distance(query_embedding)
    ).limit(top_k).all()
    return chunks

def ask(question: str, user_id: int, platform: str, db: Session) -> str:
    chunks = search_chunks(question, db)

    if not chunks:
        return "Sorry, I could not find relevant information in the documents."

    context = "\n\n".join([chunk.chunk_text for chunk in chunks])

    history = db.query(Message).filter(
        Message.user_id == user_id,
        Message.platform == platform
    ).order_by(Message.created_at.desc()).limit(6).all()
    history = list(reversed(history))

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({
        "role": "user",
        "content": f"Context from documents:\n{context}\n\nQuestion: {question}"
    })

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.2
    )

    answer = response.choices[0].message.content

    db.add(Message(user_id=user_id, platform=platform, role="user", content=question))
    db.add(Message(user_id=user_id, platform=platform, role="assistant", content=answer))
    db.commit()

    return answer