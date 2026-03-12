from aiogram import Router
from aiogram.filters import Command, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, BufferedInputFile
import httpx

from utils.database import Database
from utils.keyboards import main_menu_keyboard
from utils.messages import get_text

router = Router()


@router.message(Command("start"))
async def start_handler(
    message: Message,
    state: FSMContext,
    db: Database,
    http_client: httpx.AsyncClient,
    command: CommandObject,
) -> None:
    if command.args and command.args.startswith("file_"):
        doc_id = command.args.removeprefix("file_")
        lang = await db.get_user_lang(message.from_user.id) or "ru"

        try:
            async with http_client.stream("GET", f"/api/v1/documents/{doc_id}/file") as response:
                response.raise_for_status()
                content = await response.aread()
                file_name = response.headers.get("content-disposition", "").split("filename=")[-1].strip('"') or "document"

            await message.answer_document(BufferedInputFile(content, filename=file_name))
        except Exception:
            await message.answer(get_text(lang, "general_error"))

        return

    await db.add_user(
        telegram_id=message.from_user.id,
        name=message.from_user.full_name,
        username=message.from_user.username,
    )

    await http_client.post("/api/v1/users/register", json={
        "platform_user_id": str(message.from_user.id),
        "platform": "telegram",
        "name": message.from_user.full_name,
        "username": message.from_user.username,
    })

    lang = await db.get_user_lang(message.from_user.id) or "ru"
    await state.clear()
    text = f"{get_text(lang, 'welcome')}\n\n{get_text(lang, 'menu_hint')}"
    await message.answer(text, reply_markup=main_menu_keyboard(lang))