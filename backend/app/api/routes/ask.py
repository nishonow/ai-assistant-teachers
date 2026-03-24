from collections import defaultdict
from time import time

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_token_subject_from_authorization
from app.models import User
from app.services.rag import ask

router = APIRouter(prefix="/ask", tags=["ask"])

RATE_LIMIT = 5
RATE_WINDOW = 60

_request_counts: dict[str, list[float]] = defaultdict(list)


class HistoryMessage(BaseModel):
    role: str
    content: str


class AskRequest(BaseModel):
    question: str
    platform_user_id: str
    platform: str = "telegram"
    name: str = "User"
    username: str | None = None
    history: list[HistoryMessage] = []


def _check_rate_limit(key: str) -> None:
    now = time()
    timestamps = _request_counts[key]
    _request_counts[key] = [t for t in timestamps if now - t < RATE_WINDOW]
    if len(_request_counts[key]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
    _request_counts[key].append(now)


async def _resolve_user(request: AskRequest, db: AsyncSession, authorization: str | None) -> User:
    if request.platform == "web":
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")

        subject = get_token_subject_from_authorization(authorization)
        if subject != request.platform_user_id:
            raise HTTPException(status_code=403, detail="User mismatch")
        user = (
            await db.execute(
                select(User).where(
                    User.platform == "web",
                    User.platform_user_id == subject,
                )
            )
        ).scalar_one_or_none()
        if not user:
            user = (
                await db.execute(
                    select(User).where(
                        User.login == subject,
                        User.is_admin == True,
                    )
                )
            ).scalar_one_or_none()
    else:
        user = (
            await db.execute(
                select(User).where(
                    User.platform_user_id == request.platform_user_id,
                    User.platform == request.platform,
                )
            )
        ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.post("/")
async def ask_question(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
):
    user = await _resolve_user(request, db, authorization)

    if user.is_blocked:
        raise HTTPException(status_code=403, detail="User is blocked")

    _check_rate_limit(f"{request.platform}:{request.platform_user_id}")

    result = await ask(
        question=request.question,
        user_id=user.id,
        platform=request.platform,
        history=[m.model_dump() for m in request.history],
        db=db,
    )

    return {
        "answer": result["answer"],
        "sources": result["sources"],
    }
