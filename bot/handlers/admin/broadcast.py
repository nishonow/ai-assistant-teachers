import asyncio
import logging
import re
import time
from aiolimiter import AsyncLimiter
from aiogram import F, Router
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter, TelegramBadRequest

from utils.database import Database
from utils.keyboards import (
    admin_broadcast_keyboard, admin_menu_keyboard, admin_action_keyboard,
    admin_skip_button_keyboard
)
from utils.states import BroadcastState

router = Router()
logger = logging.getLogger(__name__)

@router.message(StateFilter(BroadcastState), F.text == "❌ Cancel")
async def cancel_broadcast_text(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("🛡️ Admin Panel:", reply_markup=admin_menu_keyboard())

@router.message(F.text == "📢 Broadcast")
@router.message(Command("broadcast"))
async def start_broadcast(message: Message, state: FSMContext):
    await state.set_state(BroadcastState.waiting_message)
    await message.answer(
        "📝 Please send the message you want to broadcast to ALL users.\n"
        "It can contain text, photos, videos, or documents.",
        reply_markup=admin_action_keyboard()
    )

@router.message(BroadcastState.waiting_message)
async def capture_broadcast_message(message: Message, state: FSMContext):
    await state.update_data(
        broadcast_message_id=message.message_id,
        broadcast_chat_id=message.chat.id
    )
    
    await state.set_state(BroadcastState.waiting_buttons)
    await message.answer(
        "🔗 **Step 2: Add Buttons (optional)**\n\n"
        "Send a list of buttons in this format:\n"
        "`[Label - URL]` or `[Label - URL | Style]`\n\n"
        "**Template:**\n"
        "```\n[Google - https://google.com | primary]\n[Join - https://t.me/example | success] [Help - https://t.me/help]\n```\n"
        "(Styles: primary, success, danger)",
        reply_markup=admin_skip_button_keyboard(),
        parse_mode="Markdown"
    )

@router.callback_query(BroadcastState.waiting_buttons, F.data == "admin:broadcast:skip")
async def skip_buttons(callback: CallbackQuery, state: FSMContext):
    await process_broadcast_preview(callback.message, state, None)
    await callback.answer()

@router.message(BroadcastState.waiting_buttons)
async def capture_buttons_template(message: Message, state: FSMContext):
    text = message.text or ""
    lines = text.split('\n')
    
    btn_rows = []
    for line in lines:
        matches = re.findall(r'\[(.*?)\]', line)
        if not matches:
            continue
            
        row = []
        for match in matches:
            parts = [p.strip() for p in match.split(' - ', 1)]
            if len(parts) < 2:
                continue
                
            label = parts[0]
            url_part = parts[1]
            style = None
            
            if ' | ' in url_part:
                url, style = [x.strip() for x in url_part.split(' | ', 1)]
            else:
                url = url_part
            
            if not url.startswith(("http://", "https://")):
                continue
                
            try:
                if style in ['primary', 'success', 'danger']:
                    row.append(InlineKeyboardButton(text=label, url=url, style=style))
                else:
                    row.append(InlineKeyboardButton(text=label, url=url))
            except (TypeError, ValueError):
                row.append(InlineKeyboardButton(text=label, url=url))
        
        if row:
            btn_rows.append(row)
            
    markup = InlineKeyboardMarkup(inline_keyboard=btn_rows) if btn_rows else None
    await process_broadcast_preview(message, state, markup)

async def process_broadcast_preview(message: Message, state: FSMContext, markup: InlineKeyboardMarkup = None):
    data = await state.get_data()
    msg_id = data.get("broadcast_message_id")
    from_chat_id = data.get("broadcast_chat_id")
    
    if markup:
        await state.update_data(broadcast_markup=markup.model_dump_json())
    else:
        await state.update_data(broadcast_markup=None)

    await message.answer("👀 Here is a preview of your broadcast:")
    await message.bot.copy_message(
        chat_id=message.chat.id,
        from_chat_id=from_chat_id,
        message_id=msg_id,
        reply_markup=markup
    )
    
    await message.answer(
        "❓ Do you want to start the broadcast to all users?",
        reply_markup=admin_broadcast_keyboard()
    )
    await state.set_state(BroadcastState.confirming)

@router.callback_query(BroadcastState.confirming, F.data == "admin:broadcast:confirm")
async def confirm_broadcast(callback: CallbackQuery, state: FSMContext, db: Database):
    data = await state.get_data()
    msg_id = data.get("broadcast_message_id")
    from_chat_id = data.get("broadcast_chat_id")
    
    serialized_markup = data.get("broadcast_markup")
    reply_markup = InlineKeyboardMarkup.model_validate_json(serialized_markup) if serialized_markup else None
    
    if not msg_id or not from_chat_id:
        await callback.message.answer("❌ Error: Message not found. Please try again.")
        await state.clear()
        return

    users = await db.get_all_users()
    total_users = len(users)
    
    status_msg = await callback.message.edit_text(f"🚀 Preparing broadcast to {total_users} users...")
    await state.clear()

    stats = {"sent": 0, "failed": 0, "blocked": 0, "done": 0}
    start_time = time.time()
    rate_limiter = AsyncLimiter(28, 1)

    async def send_to_user(target_id):
        async with rate_limiter:
            try:
                if target_id == callback.from_user.id:
                    stats["sent"] += 1
                    return

                await callback.bot.copy_message(
                    chat_id=target_id,
                    from_chat_id=from_chat_id,
                    message_id=msg_id,
                    reply_markup=reply_markup
                )
                stats["sent"] += 1
            except (TelegramForbiddenError, TelegramBadRequest):
                stats["blocked"] += 1
            except TelegramRetryAfter as e:
                await asyncio.sleep(e.retry_after)
                try:
                    await callback.bot.copy_message(
                        chat_id=target_id,
                        from_chat_id=from_chat_id,
                        message_id=msg_id,
                        reply_markup=reply_markup
                    )
                    stats["sent"] += 1
                except Exception:
                    stats["failed"] += 1
            except Exception as e:
                logger.error(f"Broadcast error for {target_id}: {e}")
                stats["failed"] += 1
            finally:
                stats["done"] += 1

    async def update_progress_ui():
        last_update_time = 0
        while stats["done"] < total_users:
            current_time = time.time()
            if current_time - last_update_time >= 3:
                elapsed = int(current_time - start_time)
                progress = (stats["done"] / total_users) * 100 if total_users > 0 else 100
                
                progress_text = (
                    f"🚀 **Broadcasting...**\n\n"
                    f"📊 Progress: {stats['done']}/{total_users} ({progress:.1f}%)\n"
                    f"✅ Sent: {stats['sent']}\n"
                    f"🚫 Blocked: {stats['blocked']}\n"
                    f"❌ Failed: {stats['failed']}\n"
                    f"⏱ Elapsed: {elapsed}s"
                )
                try:
                    await status_msg.edit_text(progress_text, parse_mode="Markdown")
                    last_update_time = current_time
                except Exception:
                    pass
            await asyncio.sleep(0.5)

    tasks = [send_to_user(uid) for uid in users]
    progress_task = asyncio.create_task(update_progress_ui())

    try:
        await asyncio.gather(*tasks)
    except Exception as e:
        logger.error(f"Global broadcast error: {e}")

    progress_task.cancel()
    
    elapsed_total = int(time.time() - start_time)
    final_text = (
        f"✅ **Broadcast Completed!**\n\n"
        f"👥 Total users: {total_users}\n"
        f"✅ Successfully sent: {stats['sent']}\n"
        f"🚫 Blocked: {stats['blocked']}\n"
        f"❌ Failed: {stats['failed']}\n"
        f"⏱ Total time: {elapsed_total}s"
    )

    try:
        await status_msg.edit_text(final_text, parse_mode="Markdown")
    except Exception:
        await callback.message.answer(final_text)

    await callback.message.answer("🛡️ Admin Panel:", reply_markup=admin_menu_keyboard())

@router.callback_query(F.data == "admin:broadcast:cancel")
async def cancel_broadcast_callback(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.delete()
    await callback.message.answer("🛡️ Admin Panel:", reply_markup=admin_menu_keyboard())
