import asyncio
from pathlib import Path

import httpx
from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from utils.database import Database
from utils.keyboards import (
    admin_action_keyboard,
    admin_documents_pagination_keyboard,
    admin_menu_keyboard,
    main_menu_keyboard,
)
from utils.states import AdminState

router = Router()


def _selection_title(action: str) -> str:
    return "Select document to delete" if action == "delete" else "Select document to reindex"


def _resolve_page(raw_page: str) -> int:
    return int(raw_page) if raw_page.isdigit() else 1


def _selection_message(action: str, documents: list[dict], page: int, page_size: int = 10) -> str:
    total = len(documents)
    total_pages = max((total + page_size - 1) // page_size, 1)
    current_page = min(max(page, 1), total_pages)
    start = (current_page - 1) * page_size
    page_docs = documents[start:start + page_size]

    lines = [_selection_title(action)]
    for offset, item in enumerate(page_docs):
        lines.append(f"{start + offset + 1}. {item['file_name']}")
    return "\n".join(lines)


def _documents_overview_message(documents: list[dict], limit: int = 20) -> str:
    total_docs = len(documents)
    total_chunks = sum(int(item.get("chunk_count") or 0) for item in documents)

    lines = [
        "📚 <b>Documents</b>", "",
        f"• Total documents: <b>{total_docs}</b>",
        f"• Total chunks: <b>{total_chunks}</b>", "",
    ]

    for index, item in enumerate(documents[:limit], start=1):
        chunk_count = int(item.get("chunk_count") or 0)
        indexed_state = "✅ indexed" if chunk_count > 0 else "⚠️ not indexed"
        lines.append(
            f"{index}) <b>{item['file_name']}</b>\n"
            f"   ID: <code>{item['id']}</code> | {item['file_type'].upper()} | Chunks: <b>{chunk_count}</b> ({indexed_state})"
        )

    if total_docs > limit:
        lines.append(f"\n… and <b>{total_docs - limit}</b> more")

    return "\n".join(lines)


@router.message(F.text == "⬅️ Back")
async def back_to_user_menu_from_admin(message: Message, state: FSMContext, db: Database) -> None:
    lang = await db.get_user_lang(message.from_user.id) or "ru"
    await state.clear()
    await message.answer("👇 Choose an action from the menu.", reply_markup=main_menu_keyboard(lang))


@router.message(F.text == "📤 Add")
async def admin_add_file_button(message: Message, state: FSMContext) -> None:
    await state.set_state(AdminState.waiting_file)
    await message.answer("📤 Send a file (.txt, .pdf, .docx).", reply_markup=admin_action_keyboard())


@router.message(AdminState.waiting_file, F.text != "❌ Cancel")
async def admin_waiting_file(message: Message, state: FSMContext, http_client: httpx.AsyncClient) -> None:
    if not message.document:
        await message.answer("⚠️ Send a file as document.", reply_markup=admin_action_keyboard())
        return

    original_name = message.document.file_name or "document"
    ext = Path(original_name).suffix.lower().lstrip(".")
    if ext not in {"txt", "pdf", "docx"}:
        await message.answer("⚠️ Only .txt, .pdf, .docx are supported.", reply_markup=admin_action_keyboard())
        return

    status_msg = await message.answer("⏳ Uploading...")

    try:
        file = await message.bot.get_file(message.document.file_id)
        file_bytes = await message.bot.download_file(file.file_path)

        response = await http_client.post(
            "/api/v1/documents/upload",
            files={"file": (original_name, file_bytes.read(), "application/octet-stream")},
            data={"uploaded_by": str(message.from_user.id)},
        )
        response.raise_for_status()
        data = response.json()
        document_id = data["id"]

        await status_msg.edit_text("⏳ Indexing document, please wait...")

        for _ in range(30):
            await asyncio.sleep(3)
            poll = await http_client.get(f"/api/v1/documents/{document_id}")
            poll.raise_for_status()
            doc_status = poll.json().get("status")

            if doc_status == "indexed":
                await state.clear()
                await status_msg.edit_text(f"✅ <b>{original_name}</b> indexed successfully.")
                await message.answer("Choose an action:", reply_markup=admin_menu_keyboard())
                return
            elif doc_status == "failed":
                await state.clear()
                await status_msg.edit_text(f"⚠️ Indexing failed for <b>{original_name}</b>.")
                await message.answer("Choose an action:", reply_markup=admin_menu_keyboard())
                return

        await state.clear()
        await status_msg.edit_text("⚠️ Indexing is taking too long. Check documents later.")
        await message.answer("Choose an action:", reply_markup=admin_menu_keyboard())

    except httpx.HTTPStatusError as e:
        await status_msg.edit_text(f"⚠️ Backend error: {e.response.status_code}")
        await message.answer("Choose an action:", reply_markup=admin_action_keyboard())
    except Exception as e:
        await status_msg.edit_text(f"⚠️ Failed: {e}")
        await message.answer("Choose an action:", reply_markup=admin_action_keyboard())


@router.message(F.text == "📚 Documents")
async def admin_list_documents(message: Message, http_client: httpx.AsyncClient) -> None:
    try:
        response = await http_client.get("/api/v1/documents/")
        response.raise_for_status()
        docs = response.json()
    except Exception:
        await message.answer("⚠️ Failed to fetch documents.", reply_markup=admin_menu_keyboard())
        return

    if not docs:
        await message.answer("📚 No documents uploaded yet.", reply_markup=admin_menu_keyboard())
        return

    await message.answer(_documents_overview_message(docs), reply_markup=admin_menu_keyboard(), parse_mode="HTML")


@router.message(F.text == "🔄 Index")
async def admin_reindex_documents(message: Message, http_client: httpx.AsyncClient) -> None:
    try:
        response = await http_client.get("/api/v1/documents/")
        response.raise_for_status()
        docs = response.json()
    except Exception:
        await message.answer("⚠️ Failed to fetch documents.", reply_markup=admin_menu_keyboard())
        return

    if not docs:
        await message.answer("📚 No documents uploaded yet.", reply_markup=admin_menu_keyboard())
        return

    await message.answer(
        _selection_message("reindex", docs, page=1),
        reply_markup=admin_documents_pagination_keyboard(docs, action="reindex", page=1),
    )


@router.message(F.text == "🗑 Delete")
async def admin_delete_prompt(message: Message, http_client: httpx.AsyncClient) -> None:
    try:
        response = await http_client.get("/api/v1/documents/")
        response.raise_for_status()
        docs = response.json()
    except Exception:
        await message.answer("⚠️ Failed to fetch documents.", reply_markup=admin_menu_keyboard())
        return

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
async def admin_documents_page(callback: CallbackQuery, http_client: httpx.AsyncClient) -> None:
    if not callback.data or not callback.message:
        await callback.answer()
        return

    _, action, _, raw_page = callback.data.split(":", maxsplit=3)
    page = _resolve_page(raw_page)

    try:
        response = await http_client.get("/api/v1/documents/")
        response.raise_for_status()
        docs = response.json()
    except Exception:
        await callback.answer("⚠️ Failed to fetch documents", show_alert=True)
        return

    if not docs:
        await callback.message.edit_text("📚 No documents uploaded yet.")
        await callback.answer()
        return

    await callback.message.edit_text(
        _selection_message(action, docs, page=page),
        reply_markup=admin_documents_pagination_keyboard(docs, action=action, page=page),
    )
    await callback.answer()


@router.callback_query(F.data.regexp(r"^admin:(delete|reindex):doc:\d+:\d+$"))
async def admin_document_action(callback: CallbackQuery, http_client: httpx.AsyncClient) -> None:
    if not callback.data or not callback.message:
        await callback.answer()
        return

    parts = callback.data.split(":", maxsplit=4)
    _, action, _, raw_document_id, raw_page = parts
    document_id = int(raw_document_id)
    page = _resolve_page(raw_page)

    await callback.answer()

    try:
        if action == "delete":
            response = await http_client.delete(f"/api/v1/documents/{document_id}")
            response.raise_for_status()
            await callback.message.answer("✅ Document deleted")
        else:
            response = await http_client.post(f"/api/v1/documents/{document_id}/reindex")
            response.raise_for_status()
            await callback.message.answer("✅ Reindexing started")
    except httpx.HTTPStatusError as e:
        await callback.message.answer(f"⚠️ Error: {e.response.status_code}")
        return

    try:
        response = await http_client.get("/api/v1/documents/")
        response.raise_for_status()
        docs = response.json()
    except Exception:
        await callback.message.answer("⚠️ Failed to refresh")
        return

    if not docs:
        await callback.message.edit_text("📚 No documents uploaded yet.")
        return

    await callback.message.edit_text(
        _selection_message(action, docs, page=page),
        reply_markup=admin_documents_pagination_keyboard(docs, action=action, page=page),
    )

@router.message(F.text == "❌ Cancel", AdminState.waiting_file)
async def admin_cancel_action(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("🔐 Admin panel. Choose an action.", reply_markup=admin_menu_keyboard())