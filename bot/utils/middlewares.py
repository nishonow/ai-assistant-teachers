from typing import Any, Awaitable, Callable

import httpx
from aiogram import BaseMiddleware


class AdminOnlyMiddleware(BaseMiddleware):
    async def __call__(self, handler: Callable[[Any, dict[str, Any]], Awaitable[Any]], event: Any, data: dict[str, Any]) -> Any:
        user = getattr(event, "from_user", None)
        if user is None:
            return None

        admin_ids = set(data.get("admin_ids") or [])
        if user.id in admin_ids:
            return await handler(event, data)

        http_client: httpx.AsyncClient = data.get("http_client")
        if http_client is None:
            return None

        try:
            response = await http_client.get("/api/v1/admin/users")
            response.raise_for_status()
            users = response.json()
            db_admin_ids = {int(u["platform_user_id"]) for u in users if u.get("is_admin") and u.get("platform") == "telegram"}
        except Exception:
            return None

        if user.id not in db_admin_ids:
            return None

        return await handler(event, data)