import asyncio
import logging
from pathlib import Path

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from config import load_config
from handlers import setup_routers
from utils.ai_helper import GeminiHelper
from utils.database import Database


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    config = load_config()

    data_dir = Path("data")
    data_dir.mkdir(parents=True, exist_ok=True)

    db = Database(data_dir / "bot.db")
    await db.init()

    ai_helper = GeminiHelper(
        api_key=config.gemini_api_key,
        model=config.gemini_model,
    )

    bot = Bot(
        token=config.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())
    setup_routers(dp)

    try:
        await dp.start_polling(
            bot,
            db=db,
            ai_helper=ai_helper,
        )
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
