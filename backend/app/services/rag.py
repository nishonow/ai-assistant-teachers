from sqlalchemy.orm import Session
from openai import OpenAI
from app.config import settings
from app.models import Chunk, Message
from app.services.embeddings import embed_text

client = OpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are Mugallim AI, a legal assistant for teachers in Kyrgyzstan.
You help teachers understand their rights based on labor law documents.

LANGUAGE RULE: You MUST respond in the EXACT language the user wrote in. 
If user writes in English → respond in English.
If user writes in Russian → respond in Russian.
If user writes in Kyrgyz → respond in Kyrgyz.
NEVER switch languages. NEVER default to Russian.

ANSWER RULES:
- For legal questions: answer ONLY from the provided document context
- For greetings, small talk, questions about yourself: answer naturally and briefly
- For questions about conversation history: answer from the chat history provided
- If legal question is not in context: say you don't have that information in the documents
- Never say "I can't answer" for non-legal questions

STYLE:
- Answer directly without meta phrases like "according to the documents", "based on the context", "the documents state"
- Just give the answer as if you know it
- Use <b> for key terms. Use - for bullet points. No markdown."""


def search_chunks(query: str, db: Session, top_k: int = 5) -> list[Chunk]:
    query_embedding = embed_text(query)
    chunks = db.query(Chunk).order_by(
        Chunk.embedding.cosine_distance(query_embedding)
    ).limit(top_k).all()
    return chunks


def is_legal_question(question: str) -> bool:
    small_talk = [
        "who are you", "what are you", "hello", "hi", "hey",
        "what did i ask", "my previous question", "what did i say",
        "who am i", "thank you", "thanks", "okay", "ok",
        "привет", "кто ты", "что ты", "спасибо", "что я спрашивал",
        "мой вопрос", "что я сказал"
    ]
    q = question.lower().strip()
    return not any(phrase in q for phrase in small_talk)


def ask(question: str, user_id: int, platform: str, db: Session) -> str:
    history = db.query(Message).filter(
        Message.user_id == user_id,
        Message.platform == platform
    ).order_by(Message.created_at.desc()).limit(6).all()
    history = list(reversed(history))

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    if is_legal_question(question):
        chunks = search_chunks(question, db)
        context = "\n\n".join([chunk.chunk_text for chunk in chunks]) if chunks else ""
        user_content = f"Document context:\n{context}\n\nQuestion: {question}" if context else f"Question: {question}"
    else:
        user_content = question

    messages.append({"role": "user", "content": user_content})

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