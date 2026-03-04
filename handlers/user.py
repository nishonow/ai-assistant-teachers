import asyncio
import html
import logging
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


def _is_generation_failure(answer: str) -> bool:
    normalized = answer.strip().lower()
    if normalized.startswith("⚠️"):
        return True

    not_found_markers = {
        "not found",
        "not found.",
        "не найдено",
        "не найдено.",
        "табылган жок",
        "табылган жок.",
    }
    return normalized in not_found_markers


def _extractive_fallback_answer(chunks: list, lang: str) -> str:
    header = "📄 Найдено в документах:" if lang == "ru" else "📄 Документтен табылды:"
    lines: list[str] = [header]

    for item in chunks[:2]:
        source = html.escape(str(getattr(item, "source", "document")))
        text = str(getattr(item, "text", "")).strip()
        if not text:
            continue
        snippet = html.escape(text[:420].strip())
        if len(text) > 420:
            snippet += "..."
        lines.append(f"• [{source}] {snippet}")

    return "\n".join(lines) if len(lines) > 1 else ""


def _thinking_frames(base_text: str) -> tuple[str, str, str, str]:
    normalized = base_text.strip()
    normalized = normalized.rstrip(".").rstrip("…").rstrip()
    if not normalized:
        normalized = "⏳"

    return (f"{normalized}", f"{normalized}.", f"{normalized}..", f"{normalized}...")


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
async def process_question_handler(message: Message, ai_helper: OpenAIHelper, rag_service: RAGService, db: Database) -> None:
    lang = await db.get_user_lang(message.from_user.id) or "ru"

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
                top_k=6,
                max_context_chars=3200,
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
                )
            except Exception:
                logger.exception("Answer generation raised exception for user_id=%s", message.from_user.id)
                answer = get_text(lang, "general_error")
            else:
                if not answer.strip():
                    fallback_answer = _extractive_fallback_answer(chunks, lang)
                    answer = fallback_answer or get_text(lang, "no_context")
                elif _is_generation_failure(answer):
                    logger.warning("Model returned failure-style response for user_id=%s: %s", message.from_user.id, answer[:180])
                    fallback_answer = _extractive_fallback_answer(chunks, lang)
                    answer = fallback_answer or get_text(lang, "no_context")

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
