import asyncpg


class Database:
    def __init__(self, dsn: str) -> None:
        self.dsn = dsn
        self.pool: asyncpg.Pool | None = None

    async def _get_pool(self) -> asyncpg.Pool:
        if self.pool is None:
            raise RuntimeError("Database pool is not initialized")
        return self.pool

    async def init(self) -> None:
        self.pool = await asyncpg.create_pool(dsn=self.dsn)

        pool = await self._get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id BIGSERIAL PRIMARY KEY,
                    telegram_id BIGINT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    username TEXT,
                    lang TEXT NOT NULL DEFAULT 'ru',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    id BIGSERIAL PRIMARY KEY,
                    file_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    uploaded_by BIGINT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS chunks (
                    id BIGSERIAL PRIMARY KEY,
                    document_id BIGINT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    chunk_text TEXT NOT NULL,
                    embedding_json TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_chunks_document
                        FOREIGN KEY(document_id)
                        REFERENCES documents(id)
                        ON DELETE CASCADE
                )
                """
            )

            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id)"
            )

    async def close(self) -> None:
        if self.pool is not None:
            await self.pool.close()
            self.pool = None

    async def add_user(self, telegram_id: int, name: str, username: str | None) -> None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (telegram_id, name, username)
                VALUES ($1, $2, $3)
                ON CONFLICT(telegram_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    username = EXCLUDED.username
                """,
                telegram_id,
                name,
                username,
            )

    async def get_user_lang(self, telegram_id: int) -> str | None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT lang FROM users WHERE telegram_id = $1",
                telegram_id,
            )

        return row["lang"] if row else None

    async def set_user_lang(self, telegram_id: int, lang: str) -> None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET lang = $1 WHERE telegram_id = $2",
                lang,
                telegram_id,
            )

    async def add_document(self, file_name: str, file_type: str, file_path: str, uploaded_by: int) -> int:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO documents (file_name, file_type, file_path, uploaded_by)
                VALUES ($1, $2, $3, $4)
                RETURNING id
                """,
                file_name,
                file_type,
                file_path,
                uploaded_by,
            )
            return int(row["id"])

    async def list_documents(self) -> list[dict]:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    d.id,
                    d.file_name,
                    d.file_type,
                    d.file_path,
                    d.created_at,
                    COUNT(c.id) AS chunk_count
                FROM documents d
                LEFT JOIN chunks c ON c.document_id = d.id
                GROUP BY d.id, d.file_name, d.file_type, d.file_path, d.created_at
                ORDER BY d.id DESC
                """
            )

        return [dict(row) for row in rows]

    async def delete_document(self, document_id: int) -> str | None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    "SELECT file_path FROM documents WHERE id = $1",
                    document_id,
                )
                if not row:
                    return None

                await conn.execute("DELETE FROM documents WHERE id = $1", document_id)

        return str(row["file_path"])

    async def get_admin_stats(self) -> dict[str, int]:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            users_total = await conn.fetchval("SELECT COUNT(*) FROM users")
            users_ru = await conn.fetchval("SELECT COUNT(*) FROM users WHERE lang = 'ru'")
            users_kg = await conn.fetchval("SELECT COUNT(*) FROM users WHERE lang = 'kg'")
            documents_total = await conn.fetchval("SELECT COUNT(*) FROM documents")
            chunks_total = await conn.fetchval("SELECT COUNT(*) FROM chunks")

        return {
            "users_total": int(users_total or 0),
            "users_ru": int(users_ru or 0),
            "users_kg": int(users_kg or 0),
            "documents_total": int(documents_total or 0),
            "chunks_total": int(chunks_total or 0),
        }

    async def replace_document_chunks(self, document_id: int, items: list[tuple[int, str, str]]) -> None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("DELETE FROM chunks WHERE document_id = $1", document_id)
                if items:
                    await conn.executemany(
                        """
                        INSERT INTO chunks (document_id, chunk_index, chunk_text, embedding_json)
                        VALUES ($1, $2, $3, $4)
                        """,
                        [
                            (document_id, chunk_index, chunk_text, embedding_json)
                            for chunk_index, chunk_text, embedding_json in items
                        ],
                    )

    async def list_chunks_with_documents(self) -> list[dict]:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    c.id,
                    c.document_id,
                    c.chunk_index,
                    c.chunk_text,
                    c.embedding_json,
                    d.file_name
                FROM chunks c
                JOIN documents d ON d.id = c.document_id
                """
            )

        return [dict(row) for row in rows]
