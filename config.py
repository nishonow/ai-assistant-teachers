import os
import json
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class Config:
    bot_token: str
    gemini_api_key: str
    postgres_url: str
    gemini_model: str = "gemini-2.0-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    admin_ids: set[int] = frozenset()


def load_config() -> Config:
    load_dotenv()

    bot_token = os.getenv("BOT_TOKEN", "").strip()
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    postgres_url = os.getenv("POSTGRES_URL", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
    gemini_embedding_model = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001").strip()
    admin_ids_raw = os.getenv("ADMIN_IDS", "[]").strip()

    try:
        admin_ids_list = json.loads(admin_ids_raw)
    except json.JSONDecodeError as exc:
        raise ValueError("ADMIN_IDS must be a JSON array, e.g. [131231, 31312312]") from exc

    if not isinstance(admin_ids_list, list):
        raise ValueError("ADMIN_IDS must be a JSON array, e.g. [131231, 31312312]")

    admin_ids = {int(item) for item in admin_ids_list}

    if not bot_token:
        raise ValueError("BOT_TOKEN is not set")

    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    if not postgres_url:
        raise ValueError("POSTGRES_URL is not set")

    return Config(
        bot_token=bot_token,
        gemini_api_key=gemini_api_key,
        postgres_url=postgres_url,
        gemini_model=gemini_model or "gemini-2.0-flash",
        gemini_embedding_model=gemini_embedding_model or "gemini-embedding-001",
        admin_ids=admin_ids,
    )
