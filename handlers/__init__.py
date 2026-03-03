from aiogram import Dispatcher

from handlers.start import router as start_router
from handlers.user import router as user_router


def setup_routers(dp: Dispatcher) -> None:
    dp.include_router(start_router)
    dp.include_router(user_router)


__all__ = ["setup_routers"]
