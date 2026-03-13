import httpx
from aiogram import F, Router
from aiogram.types import CallbackQuery, Message

from utils.keyboards import admin_menu_keyboard, admin_users_keyboard

router = Router()

PAGE_SIZE = 10


async def _fetch_users(http_client: httpx.AsyncClient) -> list[dict] | None:
    try:
        response = await http_client.get("/api/v1/admin/users")
        response.raise_for_status()
        users = response.json()
        return [u for u in users if u["platform"] == "telegram"]
    except Exception:
        return None


def _users_header(users: list[dict], page: int, page_size: int = PAGE_SIZE) -> str:
    total = len(users)
    total_pages = max((total + page_size - 1) // page_size, 1)
    return f"👥 <b>Users</b> — {total} total (page {page}/{total_pages})"


@router.message(F.text.in_(("👤 Users",)))
async def admin_users_handler(message: Message, http_client: httpx.AsyncClient) -> None:
    users = await _fetch_users(http_client)
    if users is None:
        await message.answer("⚠️ Failed to fetch users.", reply_markup=admin_menu_keyboard())
        return
    if not users:
        await message.answer("👤 No users yet.", reply_markup=admin_menu_keyboard())
        return

    await message.answer(
        _users_header(users, page=1),
        reply_markup=admin_users_keyboard(users, page=1),
        parse_mode="HTML",
    )


@router.callback_query(F.data.regexp(r"^admin:users:page:\d+$"))
async def admin_users_page(callback: CallbackQuery, http_client: httpx.AsyncClient) -> None:
    if not callback.message:
        await callback.answer()
        return

    page = int(callback.data.split(":")[-1])
    users = await _fetch_users(http_client)
    if users is None:
        await callback.answer("⚠️ Failed to fetch users", show_alert=True)
        return

    await callback.message.edit_text(
        _users_header(users, page=page),
        reply_markup=admin_users_keyboard(users, page=page),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(F.data.regexp(r"^admin:users:(block|unblock):.+:\d+$"))
async def admin_toggle_user(callback: CallbackQuery, http_client: httpx.AsyncClient) -> None:
    if not callback.message:
        await callback.answer()
        return

    parts = callback.data.split(":")
    action = parts[2]
    platform_user_id = parts[3]
    page = int(parts[4])

    try:
        response = await http_client.post(f"/api/v1/admin/users/{action}", json={
            "platform_user_id": platform_user_id,
            "platform": "telegram",
        })
        if response.status_code == 404:
            await callback.answer("⚠️ User not found", show_alert=True)
            return
        response.raise_for_status()
    except Exception:
        await callback.answer("⚠️ Failed", show_alert=True)
        return

    users = await _fetch_users(http_client)
    if users is None:
        await callback.answer("⚠️ Failed to refresh", show_alert=True)
        return

    await callback.message.edit_text(
        _users_header(users, page=page),
        reply_markup=admin_users_keyboard(users, page=page),
        parse_mode="HTML",
    )
    await callback.answer("✅ Done")