import httpx
from aiogram import F, Router
from aiogram.types import Message

from utils.keyboards import admin_menu_keyboard

router = Router()


@router.message(F.text == "📊 Stats")
async def admin_stats(message: Message, http_client: httpx.AsyncClient) -> None:
    try:
        response = await http_client.get("/api/v1/admin/stats")
        response.raise_for_status()
        stats = response.json()
    except Exception:
        await message.answer("⚠️ Failed to fetch stats.", reply_markup=admin_menu_keyboard())
        return

    await message.answer(
        f"📊 Stats:\n\n"
        f"👥 Total users: {stats.get('total_users', 0)}\n"
        f"💬 Total messages: {stats.get('total_messages', 0)}\n"
        f"📚 Documents: {stats.get('total_documents', 0)}\n"
        f"🧩 Chunks: {stats.get('total_chunks', 0)}",
        reply_markup=admin_menu_keyboard(),
    )