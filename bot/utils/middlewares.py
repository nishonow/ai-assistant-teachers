from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware


class AdminOnlyMiddleware(BaseMiddleware):
    async def __call__(self, handler: Callable[[Any, dict[str, Any]], Awaitable[Any]], event: Any, data: dict[str, Any]) -> Any:
        admin_ids = set(data.get("admin_ids") or [])
        user = getattr(event, "from_user", None)

        if user is None or user.id not in admin_ids:
            return None

        return await handler(event, data)