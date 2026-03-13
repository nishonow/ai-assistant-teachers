import os
import json
from dataclasses import dataclass

from dotenv import load_dotenv

BACKEND_URL = "http://localhost:8000"

@dataclass(frozen=True)
class Config:
    bot_token: str
    postgres_url: str
    admin_secret_token: str
    admin_ids: set[int] = frozenset()
    backend_url: str = BACKEND_URL


def load_config() -> Config:
    load_dotenv()

    bot_token = os.getenv("BOT_TOKEN", "").strip()
    postgres_url = os.getenv("POSTGRES_URL", "").strip()
    admin_ids_raw = os.getenv("ADMIN_IDS", "[]").strip()
    backend_url = os.getenv("BACKEND_URL", BACKEND_URL).strip()
    admin_secret_token = os.getenv("ADMIN_SECRET_TOKEN", "").strip()

    try:
        admin_ids_list = json.loads(admin_ids_raw)
    except json.JSONDecodeError as exc:
        raise ValueError("ADMIN_IDS must be a JSON array, e.g. [131231, 31312312]") from exc

    if not isinstance(admin_ids_list, list):
        raise ValueError("ADMIN_IDS must be a JSON array, e.g. [131231, 31312312]")

    admin_ids = {int(item) for item in admin_ids_list}

    if not bot_token:
        raise ValueError("BOT_TOKEN is not set")
    if not postgres_url:
        raise ValueError("POSTGRES_URL is not set")
    if not admin_secret_token:
        raise ValueError("ADMIN_SECRET_TOKEN is not set")

    return Config(
        bot_token=bot_token,
        postgres_url=postgres_url,
        admin_ids=admin_ids,
        backend_url=backend_url,
        admin_secret_token=admin_secret_token,
    )