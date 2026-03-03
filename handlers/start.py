from aiogram import Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from utils.database import Database
from utils.keyboards import main_menu_keyboard
from utils.messages import get_text

router = Router()


@router.message(Command("start"))
async def start_handler(message: Message, state: FSMContext, db: Database) -> None:
    await db.add_user(
        telegram_id=message.from_user.id,
        name=message.from_user.full_name,
        username=message.from_user.username,
    )

    lang = await db.get_user_lang(message.from_user.id) or "ru"

    await state.clear()
    text = f"{get_text(lang, 'welcome')}"
    await message.answer(text, reply_markup=main_menu_keyboard(lang))
