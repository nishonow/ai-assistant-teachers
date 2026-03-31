from aiogram import Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from utils.middlewares import AdminOnlyMiddleware
from utils.keyboards import admin_menu_keyboard
from handlers.admin.documents import router as documents_router
from handlers.admin.stats import router as stats_router
from handlers.admin.users import router as users_router
from handlers.admin.broadcast import router as broadcast_router

router = Router()
router.message.middleware(AdminOnlyMiddleware())
router.callback_query.middleware(AdminOnlyMiddleware())

router.include_router(documents_router)
router.include_router(stats_router)
router.include_router(users_router)
router.include_router(broadcast_router)


@router.message(Command("admin"))
async def admin_menu_handler(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("🔐 Admin panel. Choose an action.", reply_markup=admin_menu_keyboard())