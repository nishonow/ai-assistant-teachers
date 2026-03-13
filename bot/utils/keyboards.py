from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup


def main_menu_keyboard(lang: str) -> ReplyKeyboardMarkup:
    if lang == "kg":
        return ReplyKeyboardMarkup(
            keyboard=[
            [KeyboardButton(text="🤖 Суроо берүү")],
            [KeyboardButton(text="🌐 Тил")],
            ],
            resize_keyboard=True,
        )

    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🤖 Задать вопрос")],
            [KeyboardButton(text="🌐 Язык")],
        ],
        resize_keyboard=True,
    )


def question_mode_keyboard(lang: str) -> ReplyKeyboardMarkup:
    if lang == "kg":
        return ReplyKeyboardMarkup(
            keyboard=[[KeyboardButton(text="⬅️ Менюга кайтуу")]],
            resize_keyboard=True,
        )

    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="⬅️ Назад в меню")]],
        resize_keyboard=True,
    )


def admin_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📊 Stats"), KeyboardButton(text="👤 Users")],
            [KeyboardButton(text="📤 Add File"), KeyboardButton(text="📚 Documents")],
            [KeyboardButton(text="🔄 Reindex"), KeyboardButton(text="🗑 Delete Document")],
            [KeyboardButton(text="⬅️ Back to Menu")],
        ],
        resize_keyboard=True,
    )


def admin_action_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="❌ Cancel")]],
        resize_keyboard=True,
    )


def language_keyboard(current_lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✅ Русский" if current_lang == "ru" else "Русский",
                    callback_data="set_lang:ru",
                ),
                InlineKeyboardButton(
                    text="✅ Кыргызча" if current_lang == "kg" else "Кыргызча",
                    callback_data="set_lang:kg",
                ),
            ]
        ]
    )


def admin_documents_pagination_keyboard(
    documents: list[dict],
    action: str,
    page: int = 1,
    page_size: int = 10,
) -> InlineKeyboardMarkup:
    total = len(documents)
    total_pages = max((total + page_size - 1) // page_size, 1)
    current_page = min(max(page, 1), total_pages)
    start = (current_page - 1) * page_size
    end = start + page_size
    page_docs = documents[start:end]

    rows: list[list[InlineKeyboardButton]] = []
    number_buttons: list[InlineKeyboardButton] = []
    for offset, item in enumerate(page_docs):
        document_id = int(item["id"])
        display_number = start + offset + 1
        number_buttons.append(
            InlineKeyboardButton(
                text=str(display_number),
                callback_data=f"admin:{action}:doc:{document_id}:{current_page}",
            )
        )

    if number_buttons:
        rows.append(number_buttons[:5])
    if len(number_buttons) > 5:
        rows.append(number_buttons[5:10])

    prev_callback = f"admin:{action}:page:{current_page - 1}" if current_page > 1 else "admin:noop"
    next_callback = f"admin:{action}:page:{current_page + 1}" if current_page < total_pages else "admin:noop"

    nav_row = [
        InlineKeyboardButton(text="⬅️ Prev", callback_data=prev_callback),
        InlineKeyboardButton(text=f"{current_page}/{total_pages}", callback_data="admin:noop"),
        InlineKeyboardButton(text="Next ➡️", callback_data=next_callback),
    ]

    rows.append(nav_row)
    return InlineKeyboardMarkup(inline_keyboard=rows)


def admin_users_keyboard(
    users: list[dict],
    page: int = 1,
    page_size: int = 10,
) -> InlineKeyboardMarkup:
    total = len(users)
    total_pages = max((total + page_size - 1) // page_size, 1)
    current_page = min(max(page, 1), total_pages)
    start = (current_page - 1) * page_size
    page_users = users[start:start + page_size]

    rows: list[list[InlineKeyboardButton]] = []

    for user in page_users:
        uid = user["platform_user_id"]
        name = user["name"]
        is_blocked = user["is_blocked"]
        toggle_action = "unblock" if is_blocked else "block"
        toggle_text = "✅ Unblock" if is_blocked else "⛔️ Block"
        status = "⛔️" if is_blocked else "✅"

        rows.append([
            InlineKeyboardButton(
                text=f"{status} {name}",
                callback_data="admin:noop",
            ),
            InlineKeyboardButton(
                text=toggle_text,
                callback_data=f"admin:users:{toggle_action}:{uid}:{current_page}",
            ),
        ])

    prev_callback = f"admin:users:page:{current_page - 1}" if current_page > 1 else "admin:noop"
    next_callback = f"admin:users:page:{current_page + 1}" if current_page < total_pages else "admin:noop"

    rows.append([
        InlineKeyboardButton(text="⬅️ Prev", callback_data=prev_callback),
        InlineKeyboardButton(text=f"{current_page}/{total_pages}", callback_data="admin:noop"),
        InlineKeyboardButton(text="Next ➡️", callback_data=next_callback),
    ])

    return InlineKeyboardMarkup(inline_keyboard=rows)