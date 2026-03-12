import asyncio
import logging
from contextlib import suppress

import httpx
from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from utils.database import Database
from utils.keyboards import language_keyboard, main_menu_keyboard, question_mode_keyboard
from utils.messages import get_text
from utils.states import AskTeacherState

router = Router()
logger = logging.getLogger(__name__)
HISTORY_KEY = "chat_history"
HISTORY_LIMIT = 5


def _thinking_frames(base_text: str) -> tuple:
    normalized = base_text.strip().rstrip(".").rstrip("…").rstrip() or "⏳"
    return (f"{normalized}", f"{normalized}.", f"{normalized}..", f"{normalized}...")


async def _animate_thinking(status_message: Message, stop_event: asyncio.Event, frames: tuple) -> None:
    index = 1
    while not stop_event.is_set():
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=0.6)
            break
        except asyncio.TimeoutError:
            pass
        try:
            await status_message.edit_text(frames[index % len(frames)])
        except TelegramBadRequest:
            return
        index += 1


@router.message(F.text.in_(("🌐 Язык", "🌐 Тил")))
async def choose_language_handler(message: Message, db: Database) -> None:
    lang = await db.get_user_lang(message.from_user.id) or "ru"
    await message.answer(get_text(lang, "choose_language"), reply_markup=language_keyboard(lang))


@router.callback_query(F.data.startswith("set_lang:"))
async def set_language_callback(callback: CallbackQuery, state: FSMContext, db: Database) -> None:
    _, lang = callback.data.split(":", maxsplit=1)
    await db.set_user_lang(callback.from_user.id, lang)
    await state.clear()
    await callback.answer(get_text(lang, "lang_updated"), show_alert=True)
    if callback.message:
        try:
            await callback.message.edit_text(get_text(lang, "choose_language"), reply_markup=language_keyboard(lang))
        except TelegramBadRequest:
            pass
        await callback.message.answer(get_text(lang, "menu_hint"), reply_markup=main_menu_keyboard(lang))


@router.message(F.text.in_(("🤖 Задать вопрос", "🤖 Суроо берүү")))
async def ask_mode_handler(message: Message, state: FSMContext, db: Database) -> None:
    lang = await db.get_user_lang(message.from_user.id) or "ru"
    await state.set_state(AskTeacherState.waiting_question)
    await state.update_data(**{HISTORY_KEY: []})
    await message.answer(get_text(lang, "ask_prompt"), reply_markup=question_mode_keyboard(lang))


@router.message(AskTeacherState.waiting_question, F.text.in_(("⬅️ Назад в меню", "⬅️ Менюга кайтуу")))
async def back_to_menu_from_question(message: Message, state: FSMContext, db: Database) -> None:
    await state.clear()
    lang = await db.get_user_lang(message.from_user.id) or "ru"
    await message.answer(get_text(lang, "menu_hint"), reply_markup=main_menu_keyboard(lang))


@router.message(AskTeacherState.waiting_question)
async def process_question_handler(
    message: Message,
    http_client: httpx.AsyncClient,
    db: Database,
    state: FSMContext,
) -> None:
    lang = await db.get_user_lang(message.from_user.id) or "ru"
    question = (message.text or "").strip()

    if not question:
        await message.answer(get_text(lang, "empty_question"))
        return

    state_data = await state.get_data()
    history = state_data.get(HISTORY_KEY, [])

    frames = _thinking_frames(get_text(lang, "thinking"))
    thinking_message = await message.answer(frames[0])
    stop_event = asyncio.Event()
    animation_task = asyncio.create_task(_animate_thinking(thinking_message, stop_event, frames))
    answer = get_text(lang, "general_error")

    try:
        response = await http_client.post("/api/v1/ask/", json={
            "question": question,
            "platform_user_id": str(message.from_user.id),
            "platform": "telegram",
            "name": message.from_user.full_name,
            "username": message.from_user.username,
            "history": history,
        })
        response.raise_for_status()
        answer = response.json().get("answer") or get_text(lang, "no_context")

        history.append({"role": "user", "content": question})
        history.append({"role": "assistant", "content": answer})
        await state.update_data(**{HISTORY_KEY: history[-HISTORY_LIMIT * 2:]})

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 403:
            answer = get_text(lang, "user_blocked")
        else:
            logger.error("Backend error: %s", e)
    except httpx.RequestError as e:
        logger.error("Backend unreachable: %s", e)
    finally:
        stop_event.set()
        with suppress(asyncio.CancelledError):
            await animation_task
        with suppress(TelegramBadRequest):
            await thinking_message.delete()

    await message.answer(answer, reply_markup=question_mode_keyboard(lang), parse_mode="HTML")


@router.message(F.text.in_(("⬅️ Назад в меню", "⬅️ Менюга кайтуу")))
async def back_button_outside_state(message: Message, state: FSMContext, db: Database) -> None:
    await state.clear()
    lang = await db.get_user_lang(message.from_user.id) or "ru"
    await message.answer(get_text(lang, "menu_hint"), reply_markup=main_menu_keyboard(lang))


@router.message()
async def fallback_handler(message: Message, state: FSMContext, db: Database) -> None:
    await state.clear()
    lang = await db.get_user_lang(message.from_user.id) or "ru"
    text = f"{get_text(lang, 'welcome')}\n\n{get_text(lang, 'menu_hint')}"
    await message.answer(text, reply_markup=main_menu_keyboard(lang))