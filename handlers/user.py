import asyncio
import html
import logging
import re
from contextlib import suppress

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from utils.ai_helper import OpenAIHelper
from utils.database import Database
from utils.keyboards import language_keyboard, main_menu_keyboard, question_mode_keyboard
from utils.messages import get_text
from utils.rag import RAGService
from utils.states import AskTeacherState

router = Router()
logger = logging.getLogger(__name__)
CHAT_HISTORY_KEY = "chat_history"
CHAT_HISTORY_LIMIT = 5


def _thinking_frames(base_text: str) -> tuple[str, str, str, str]:
    normalized = base_text.strip()
    normalized = normalized.rstrip(".").rstrip("…").rstrip()
    if not normalized:
        normalized = "⏳"

    return (f"{normalized}", f"{normalized}.", f"{normalized}..", f"{normalized}...")


def _plain_text_for_history(text: str) -> str:
    # Strip lightweight HTML formatting before reusing previous assistant messages in prompts.
    stripped = re.sub(r"<[^>]+>", " ", str(text or ""))
    return html.unescape(re.sub(r"\s+", " ", stripped)).strip()


async def _animate_thinking(status_message: Message, stop_event: asyncio.Event, frames: tuple[str, str, str, str]) -> None:
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

    await message.answer(
        get_text(lang, "choose_language"),
        reply_markup=language_keyboard(lang),
    )


@router.callback_query(F.data.startswith("set_lang:"))
async def set_language_callback(callback: CallbackQuery, state: FSMContext, db: Database) -> None:
    _, lang = callback.data.split(":", maxsplit=1)

    await db.set_user_lang(callback.from_user.id, lang)

    await state.clear()
    await callback.answer(get_text(lang, "lang_updated"), show_alert=True)

    if callback.message:
        try:
            await callback.message.edit_text(
                get_text(lang, "choose_language"),
                reply_markup=language_keyboard(lang),
            )
        except TelegramBadRequest:
            pass

        await callback.message.answer(
            get_text(lang, "menu_hint"),
            reply_markup=main_menu_keyboard(lang),
        )


@router.message(F.text.in_(("🤖 Задать вопрос", "🤖 Суроо берүү")))
async def ask_mode_handler(message: Message, state: FSMContext, db: Database) -> None:
    lang = await db.get_user_lang(message.from_user.id) or "ru"

    await state.set_state(AskTeacherState.waiting_question)
    await state.update_data(**{CHAT_HISTORY_KEY: []})
    await message.answer(
        get_text(lang, "ask_prompt"),
        reply_markup=question_mode_keyboard(lang),
    )


@router.message(AskTeacherState.waiting_question, F.text.in_(("⬅️ Назад в меню", "⬅️ Менюга кайтуу")))
async def back_to_menu_from_question(message: Message, state: FSMContext, db: Database) -> None:
    await state.clear()

    lang = await db.get_user_lang(message.from_user.id) or "ru"
    await message.answer(
        get_text(lang, "menu_hint"),
        reply_markup=main_menu_keyboard(lang),
    )


@router.message(AskTeacherState.waiting_question)
async def process_question_handler(
    message: Message,
    ai_helper: OpenAIHelper,
    rag_service: RAGService,
    db: Database,
    state: FSMContext,
) -> None:
    lang = await db.get_user_lang(message.from_user.id) or "ru"
    state_data = await state.get_data()
    history_items = state_data.get(CHAT_HISTORY_KEY, [])
    chat_history = history_items if isinstance(history_items, list) else []

    question = (message.text or "").strip()
    if not question:
        await message.answer(get_text(lang, "empty_question"))
        return

    frames = _thinking_frames(get_text(lang, "thinking"))
    thinking_message = await message.answer(frames[0])
    stop_event = asyncio.Event()
    animation_task = asyncio.create_task(_animate_thinking(thinking_message, stop_event, frames))
    started_at = asyncio.get_running_loop().time()
    answer = get_text(lang, "no_context")

    try:
        try:
            chunks = await rag_service.retrieve_relevant_chunks(
                db=db,
                question=question,
                top_k=10,
                max_context_chars=9000,
            )
        except Exception:
            logger.exception("RAG retrieval failed for user_id=%s", message.from_user.id)
            chunks = None

        if chunks is None:
            answer = get_text(lang, "general_error")
        elif not chunks:
            logger.info("RAG returned no chunks for user_id=%s", message.from_user.id)
            answer = get_text(lang, "no_context")
        else:
            logger.info("RAG returned %s chunks for user_id=%s", len(chunks), message.from_user.id)
            contexts = [f"[{item.source}] {item.text}" for item in chunks]
            try:
                answer = await ai_helper.generate_answer(
                    question=question,
                    language=lang,
                    contexts=contexts,
                    chat_history=chat_history,
                )
            except Exception:
                logger.exception("Answer generation raised exception for user_id=%s", message.from_user.id)
                answer = get_text(lang, "general_error")
            else:
                if not answer.strip():
                    answer = get_text(lang, "no_context")

        elapsed = asyncio.get_running_loop().time() - started_at
        if elapsed < 2.0:
            await asyncio.sleep(2.0 - elapsed)
    except Exception:
        logger.exception("Unhandled error in process_question_handler for user_id=%s", message.from_user.id)
        answer = get_text(lang, "general_error")
    finally:
        stop_event.set()
        with suppress(asyncio.CancelledError):
            await animation_task
        with suppress(TelegramBadRequest):
            await thinking_message.delete()

    if answer != get_text(lang, "general_error"):
        cleaned_answer = _plain_text_for_history(answer)
        if cleaned_answer:
            updated_history = list(chat_history)
            updated_history.append(
                {
                    "question": question,
                    "answer": cleaned_answer,
                }
            )
            await state.update_data(**{CHAT_HISTORY_KEY: updated_history[-CHAT_HISTORY_LIMIT:]})

    await message.answer(
        answer,
        reply_markup=question_mode_keyboard(lang),
        parse_mode="HTML",
    )


@router.message(F.text.in_(("⬅️ Назад в меню", "⬅️ Менюга кайтуу")))
async def back_button_outside_state(message: Message, state: FSMContext, db: Database) -> None:
    await state.clear()

    lang = await db.get_user_lang(message.from_user.id) or "ru"
    await message.answer(
        get_text(lang, "menu_hint"),
        reply_markup=main_menu_keyboard(lang),
    )


@router.message()
async def fallback_handler(message: Message, state: FSMContext, db: Database) -> None:
    await state.clear()

    lang = await db.get_user_lang(message.from_user.id) or "ru"
    text = f"{get_text(lang, 'welcome')}\n\n{get_text(lang, 'menu_hint')}"

    await message.answer(
        text,
        reply_markup=main_menu_keyboard(lang),
    )
