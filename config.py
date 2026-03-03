import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class Config:
    bot_token: str
    gemini_api_key: str
    gemini_model: str = "gemini-2.0-flash"


def load_config() -> Config:
    load_dotenv()

    bot_token = os.getenv("BOT_TOKEN", "").strip()
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()

    if not bot_token:
        raise ValueError("BOT_TOKEN is not set")

    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    return Config(
        bot_token=bot_token,
        gemini_api_key=gemini_api_key,
        gemini_model=gemini_model or "gemini-2.0-flash",
    )
