import logging

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

TITLE_MODEL = "gpt-4o-mini"
MAX_TITLE_LEN = 80
TITLE_MAX_TOKENS = 16


def _normalize_title(raw_title: str | None) -> str:
    if not raw_title:
        return ""

    normalized = " ".join(raw_title.strip().split())
    normalized = normalized.strip().strip('"').strip("'").strip()
    return normalized[:MAX_TITLE_LEN]


async def generate_chat_title(first_question: str) -> str:
    normalized_question = " ".join((first_question or "").strip().split())
    if not normalized_question:
        return "New chat"

    try:
        response = await client.chat.completions.create(
            model=TITLE_MODEL,
            temperature=0,
            max_tokens=TITLE_MAX_TOKENS,
            messages=[
                {
                    "role": "system",
                    "content": "Generate a concise chat title with 3-5 words. Return only title text without quotes or punctuation-heavy wrappers.",
                },
                {"role": "user", "content": normalized_question},
            ],
        )
        title = _normalize_title(response.choices[0].message.content)
        if title:
            return title
        logger.warning("title generation returned empty; using fallback")
    except Exception:
        logger.exception("title generation failed")

    fallback = normalized_question[:MAX_TITLE_LEN]
    return fallback or "New chat"
