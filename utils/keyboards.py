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
            [KeyboardButton(text="📊 Stats")],
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
    page_size: int = 8,
) -> InlineKeyboardMarkup:
    total = len(documents)
    total_pages = max((total + page_size - 1) // page_size, 1)
    current_page = min(max(page, 1), total_pages)
    start = (current_page - 1) * page_size
    end = start + page_size
    page_docs = documents[start:end]

    rows: list[list[InlineKeyboardButton]] = []
    for item in page_docs:
        document_id = int(item["id"])
        file_name = str(item["file_name"])
        short_name = file_name[:38] + "..." if len(file_name) > 41 else file_name
        rows.append(
            [
                InlineKeyboardButton(
                    text=short_name,
                    callback_data=f"admin:{action}:doc:{document_id}:{current_page}",
                )
            ]
        )

    nav_row: list[InlineKeyboardButton] = []
    if current_page > 1:
        nav_row.append(
            InlineKeyboardButton(
                text="⬅️",
                callback_data=f"admin:{action}:page:{current_page - 1}",
            )
        )

    nav_row.append(
        InlineKeyboardButton(
            text=f"{current_page}/{total_pages}",
            callback_data="admin:noop",
        )
    )

    if current_page < total_pages:
        nav_row.append(
            InlineKeyboardButton(
                text="➡️",
                callback_data=f"admin:{action}:page:{current_page + 1}",
            )
        )

    rows.append(nav_row)
    return InlineKeyboardMarkup(inline_keyboard=rows)
