import re
from pathlib import Path
from uuid import uuid4

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from utils.database import Database
from utils.document_parser import extract_text_from_file
from utils.keyboards import (
    admin_action_keyboard,
    admin_documents_pagination_keyboard,
    admin_menu_keyboard,
    main_menu_keyboard,
)
from utils.middlewares import AdminOnlyMiddleware
from utils.rag import RAGService
from utils.states import AdminState

router = Router()
router.message.middleware(AdminOnlyMiddleware())
router.callback_query.middleware(AdminOnlyMiddleware())


def _safe_file_name(file_name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", file_name)
    return cleaned.strip("._") or "document"


def _selection_title(action: str) -> str:
    if action == "delete":
        return "Select number of document to delete"
    return "Select number of document to reindex"


def _resolve_page(raw_page: str) -> int:
    return int(raw_page) if raw_page.isdigit() else 1


def _selection_message(action: str, documents: list[dict], page: int, page_size: int = 10) -> str:
    total = len(documents)
    total_pages = max((total + page_size - 1) // page_size, 1)
    current_page = min(max(page, 1), total_pages)
    start = (current_page - 1) * page_size
    end = start + page_size
    page_docs = documents[start:end]

    lines = [_selection_title(action)]
    for offset, item in enumerate(page_docs):
        number = start + offset + 1
        lines.append(f"{number}. {item['file_name']}")

    return "\n".join(lines)


@router.message(Command("admin"))
async def admin_menu_handler(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer(
        "🔐 Admin panel. Choose an action.",
        reply_markup=admin_menu_keyboard(),
    )


@router.message(F.text.in_(("⬅️ Back to Menu",)))
async def back_to_user_menu_from_admin(message: Message, state: FSMContext, db: Database) -> None:
    lang = await db.get_user_lang(message.from_user.id) or "ru"

    await state.clear()
    await message.answer(
        "👇 Choose an action from the menu.",
        reply_markup=main_menu_keyboard(lang),
    )


@router.message(F.text.in_(("📤 Add File",)))
async def admin_add_file_button(message: Message, state: FSMContext) -> None:
    await state.set_state(AdminState.waiting_file)
    await message.answer(
        "📤 Send a file (.txt or .pdf).",
        reply_markup=admin_action_keyboard(),
    )


@router.message(AdminState.waiting_file, F.text != "❌ Cancel")
async def admin_waiting_file(message: Message, state: FSMContext, db: Database, rag_service: RAGService, docs_dir: Path) -> None:
    if not message.document:
        await message.answer("⚠️ Send a file as document.", reply_markup=admin_action_keyboard())
        return

    original_name = message.document.file_name or "document"
    ext = Path(original_name).suffix.lower()
    if ext not in {".txt", ".pdf"}:
        await message.answer("⚠️ Only .txt and .pdf are supported.", reply_markup=admin_action_keyboard())
        return

    safe_name = _safe_file_name(original_name)
    stored_name = f"{uuid4().hex}_{safe_name}"
    target_path = docs_dir / stored_name

    try:
        file = await message.bot.get_file(message.document.file_id)
        with target_path.open("wb") as output_file:
            await message.bot.download_file(file.file_path, destination=output_file)

        await message.answer("⏳ Processing file and creating index...", reply_markup=admin_action_keyboard())

        text_content = extract_text_from_file(target_path)
        if not text_content.strip():
            target_path.unlink(missing_ok=True)
            await message.answer("⚠️ Failed to process file.", reply_markup=admin_action_keyboard())
            return

        document_id = await db.add_document(
            file_name=original_name,
            file_type=ext.lstrip("."),
            file_path=str(target_path),
            uploaded_by=message.from_user.id,
        )

        chunk_count = await rag_service.index_document(
            db=db,
            document_id=document_id,
            text=text_content,
        )

        if chunk_count <= 0:
            await message.answer("⚠️ Failed to index file. Check embedding model/API key.", reply_markup=admin_action_keyboard())
            return

        await state.clear()
        await message.answer(
            f"✅ File added. Indexed chunks: {chunk_count}.",
            reply_markup=admin_menu_keyboard(),
        )
    except Exception:
        target_path.unlink(missing_ok=True)
        await message.answer("⚠️ Failed to process file.", reply_markup=admin_action_keyboard())


@router.message(F.text.in_(("📚 Documents",)))
async def admin_list_documents(message: Message, db: Database) -> None:
    docs = await db.list_documents()
    if not docs:
        await message.answer("📚 No documents uploaded yet.", reply_markup=admin_menu_keyboard())
        return

    lines = []
    for item in docs:
        lines.append(
            f"ID {item['id']} | {item['file_name']} | {item['file_type']} | chunks: {item['chunk_count']}"
        )

    await message.answer(
        "📚 Documents:\n\n" + "\n".join(lines),
        reply_markup=admin_menu_keyboard(),
    )


@router.message(F.text.in_(("📊 Stats",)))
async def admin_stats(message: Message, db: Database) -> None:
    stats = await db.get_admin_stats()
    await message.answer(
        "📊 Bot stats:\n\n"
        f"👥 Total users: {stats['users_total']}\n"
        f"🇷🇺 RU users: {stats['users_ru']}\n"
        f"🇰🇬 KG users: {stats['users_kg']}\n"
        f"📚 Documents: {stats['documents_total']}\n"
        f"🧩 Chunks: {stats['chunks_total']}",
        reply_markup=admin_menu_keyboard(),
    )


@router.message(F.text.in_(("🔄 Reindex",)))
async def admin_reindex_documents(message: Message, db: Database) -> None:
    docs = await db.list_documents()
    if not docs:
        await message.answer("📚 No documents uploaded yet.", reply_markup=admin_menu_keyboard())
        return

    await message.answer(
        _selection_message("reindex", docs, page=1),
        reply_markup=admin_documents_pagination_keyboard(docs, action="reindex", page=1),
    )


@router.message(F.text.in_(("🗑 Delete Document",)))
async def admin_delete_prompt(message: Message, db: Database) -> None:
    docs = await db.list_documents()
    if not docs:
        await message.answer("📚 No documents uploaded yet.", reply_markup=admin_menu_keyboard())
        return

    await message.answer(
        _selection_message("delete", docs, page=1),
        reply_markup=admin_documents_pagination_keyboard(docs, action="delete", page=1),
    )


@router.callback_query(F.data == "admin:noop")
async def admin_noop_callback(callback: CallbackQuery) -> None:
    await callback.answer()


@router.callback_query(F.data.regexp(r"^admin:(delete|reindex):page:\d+$"))
async def admin_documents_page(callback: CallbackQuery, db: Database) -> None:
    if not callback.data or not callback.message:
        await callback.answer()
        return

    _, action, _, raw_page = callback.data.split(":", maxsplit=3)
    docs = await db.list_documents()
    if not docs:
        await callback.message.edit_text("📚 No documents uploaded yet.")
        await callback.answer()
        return

    page = _resolve_page(raw_page)
    await callback.message.edit_text(
        _selection_message(action, docs, page=page),
        reply_markup=admin_documents_pagination_keyboard(docs, action=action, page=page),
    )
    await callback.answer()


@router.callback_query(F.data.regexp(r"^admin:(delete|reindex):doc:\d+:\d+$"))
async def admin_document_action(callback: CallbackQuery, db: Database, rag_service: RAGService) -> None:
    if not callback.data or not callback.message:
        await callback.answer()
        return

    _, action, _, raw_document_id, raw_page = callback.data.split(":", maxsplit=4)
    document_id = int(raw_document_id)
    page = _resolve_page(raw_page)

    if action == "delete":
        file_path = await db.delete_document(document_id)
        if file_path:
            path = Path(file_path)
            if path.exists():
                path.unlink(missing_ok=True)
            await callback.answer("✅ Document deleted", show_alert=True)
        else:
            await callback.answer("⚠️ Document not found", show_alert=True)
    else:
        docs = await db.list_documents()
        selected = next((item for item in docs if int(item["id"]) == document_id), None)
        if not selected:
            await callback.answer("⚠️ Document not found", show_alert=True)
        else:
            path = Path(str(selected["file_path"]))
            if not path.exists():
                await callback.answer("⚠️ File is missing", show_alert=True)
            else:
                try:
                    text_content = extract_text_from_file(path)
                    if not text_content.strip():
                        await callback.answer("⚠️ Failed to parse file", show_alert=True)
                    else:
                        chunks = await rag_service.index_document(
                            db=db,
                            document_id=document_id,
                            text=text_content,
                        )
                        await callback.answer(f"✅ Reindexed: {chunks} chunks", show_alert=True)
                except Exception:
                    await callback.answer("⚠️ Reindex failed", show_alert=True)

    refreshed_docs = await db.list_documents()
    if not refreshed_docs:
        await callback.message.edit_text("📚 No documents uploaded yet.")
        return

    await callback.message.edit_text(
        _selection_message(action, refreshed_docs, page=page),
        reply_markup=admin_documents_pagination_keyboard(refreshed_docs, action=action, page=page),
    )


@router.message(F.text == "❌ Cancel", AdminState.waiting_file)
async def admin_cancel_action(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("❌ Action cancelled.", reply_markup=admin_menu_keyboard())
