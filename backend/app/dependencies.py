from fastapi import Depends, Header, HTTPException
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User


def _get_bearer_token(authorization: str) -> str:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return token


def _decode_subject(token: str) -> str:
    if token == settings.ADMIN_SECRET_TOKEN:
        return settings.ADMIN_USERNAME

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return subject


def get_token_subject_from_authorization(authorization: str) -> str:
    return _decode_subject(_get_bearer_token(authorization))


async def require_admin(authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    subject = get_token_subject_from_authorization(authorization)

    if subject == settings.ADMIN_USERNAME:
        return

    admin_user = (
        await db.execute(
            select(User).where(
                User.login == subject,
                User.is_admin == True,
            )
        )
    ).scalar_one_or_none()
    if not admin_user:
        admin_user = (
            await db.execute(
                select(User).where(
                    User.platform == "web",
                    User.platform_user_id == subject,
                    User.is_admin == True,
                )
            )
        ).scalar_one_or_none()
    if not admin_user:
        raise HTTPException(status_code=403, detail="Admin access required")


async def require_web_user(authorization: str = Header(...), db: AsyncSession = Depends(get_db)) -> User:
    subject = get_token_subject_from_authorization(authorization)

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
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_blocked:
        raise HTTPException(status_code=403, detail="User is blocked")

    return user
