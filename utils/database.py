from pathlib import Path

import aiosqlite


class Database:
    def __init__(self, db_path: Path) -> None:
        self.db_path = str(db_path)

    async def init(self) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    username TEXT,
                    lang TEXT NOT NULL DEFAULT 'ru',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            await db.commit()

    async def add_user(
        self,
        telegram_id: int,
        name: str,
        username: str | None,
    ) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO users (telegram_id, name, username)
                VALUES (?, ?, ?)
                ON CONFLICT(telegram_id) DO UPDATE SET
                    name = excluded.name,
                    username = excluded.username
                """,
                (telegram_id, name, username),
            )
            await db.commit()

    async def get_user_lang(self, telegram_id: int) -> str | None:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT lang FROM users WHERE telegram_id = ?",
                (telegram_id,),
            )
            row = await cursor.fetchone()
            await cursor.close()

        return row[0] if row else None

    async def set_user_lang(self, telegram_id: int, lang: str) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE users SET lang = ? WHERE telegram_id = ?",
                (lang, telegram_id),
            )
            await db.commit()
