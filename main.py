import asyncio
import logging
from pathlib import Path

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from config import load_config
from handlers import setup_routers
from utils.ai_helper import OpenAIHelper
from utils.database import Database
from utils.rag import RAGService


async def reset_database_on_startup(db: Database) -> None:
    logger = logging.getLogger("bot")
    logger.warning("DATABASE RESET ENABLED: clearing all users, documents, and chunks")
    await db.clear_all_data()
    logger.warning("DATABASE RESET COMPLETE")


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    logging.getLogger("aiogram.event").setLevel(logging.WARNING)
    logging.getLogger("aiogram.dispatcher").setLevel(logging.WARNING)
    logger = logging.getLogger("bot")
    config = load_config()

    data_dir = Path("data")
    docs_dir = data_dir / "docs"
    data_dir.mkdir(parents=True, exist_ok=True)
    docs_dir.mkdir(parents=True, exist_ok=True)

    db = Database(config.postgres_url)
    await db.init()

    # WARNING: Uncomment for one-time production reset, then comment again.
    # await reset_database_on_startup(db)

    ai_helper = OpenAIHelper(
        api_key=config.openai_api_key,
        model=config.openai_model,
    )
    rag_service = RAGService(
        api_key=config.openai_api_key,
        embedding_model=config.openai_embedding_model,
    )

    bot = Bot(
        token=config.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())
    setup_routers(dp)

    logger.info("Bot is running")

    try:
        await dp.start_polling(
            bot,
            db=db,
            ai_helper=ai_helper,
            rag_service=rag_service,
            admin_ids=config.admin_ids,
            docs_dir=docs_dir,
        )
    finally:
        await db.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
