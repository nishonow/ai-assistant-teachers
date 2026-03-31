import asyncpg


class Database:
    def __init__(self, dsn: str) -> None:
        self.dsn = dsn
        self.pool: asyncpg.Pool | None = None

    async def init(self) -> None:
        self.pool = await asyncpg.create_pool(dsn=self.dsn)
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS bot_users (
                    telegram_id BIGINT PRIMARY KEY,
                    lang TEXT NOT NULL DEFAULT 'ru'
                )
            """)

    async def close(self) -> None:
        if self.pool:
            await self.pool.close()

    async def add_user(self, telegram_id: int, name: str, username: str | None) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO bot_users (telegram_id) VALUES ($1)
                ON CONFLICT DO NOTHING
            """, telegram_id)

    async def get_user_lang(self, telegram_id: int) -> str | None:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT lang FROM bot_users WHERE telegram_id = $1", telegram_id
            )
        return row["lang"] if row else None

    async def set_user_lang(self, telegram_id: int, lang: str) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE bot_users SET lang = $1 WHERE telegram_id = $2", lang, telegram_id
            )

    async def get_all_users(self) -> list[int]:
        if not self.pool:
            return []
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT telegram_id FROM bot_users")
        return [row["telegram_id"] for row in rows]