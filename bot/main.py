import asyncio
import logging
from pathlib import Path

import httpx
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from config import load_config
from handlers import setup_routers
from utils.database import Database


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    logging.getLogger("aiogram.event").setLevel(logging.WARNING)
    logging.getLogger("aiogram.dispatcher").setLevel(logging.WARNING)
    logger = logging.getLogger("bot")

    config = load_config()

    db = Database(config.postgres_url)
    await db.init()

    http_client = httpx.AsyncClient(base_url=config.backend_url, timeout=60.0)

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
            http_client=http_client,
            admin_ids=config.admin_ids,
        )
    finally:
        await db.close()
        await http_client.aclose()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())