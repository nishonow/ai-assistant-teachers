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
