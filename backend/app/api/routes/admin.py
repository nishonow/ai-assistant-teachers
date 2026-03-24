import asyncio

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models import ChatConversation, ChatConversationMessage, Chunk, Document, Message, User

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

class BlockRequest(BaseModel):
    platform_user_id: str
    platform: str = "telegram"

class MakeAdminRequest(BaseModel):
    login: str | None = None
    password: str | None = None

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_users = await db.scalar(select(func.count(User.id)))
    total_messages = await db.scalar(select(func.count(Message.id)))
    saved_web_messages = await db.scalar(select(func.count(ChatConversationMessage.id)))
    saved_web_conversations = await db.scalar(select(func.count(ChatConversation.id)))
    total_documents = await db.scalar(select(func.count(Document.id)))
    total_chunks = await db.scalar(select(func.count(Chunk.id)))

    messages_by_platform = (
        await db.execute(
            select(
                Message.platform,
                func.count(Message.id),
            ).group_by(Message.platform)
        )
    ).all()

    return {
        "total_users": total_users,
        "total_messages": total_messages,
        "saved_web_messages": saved_web_messages,
        "saved_web_conversations": saved_web_conversations,
        "total_documents": total_documents,
        "total_chunks": total_chunks,
        "by_platform": {platform: count for platform, count in messages_by_platform},
    }

@router.post("/users/block")
async def block_user(request: BlockRequest, db: AsyncSession = Depends(get_db)):
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
    user.is_blocked = True
    await db.commit()
    return {"ok": True}

@router.post("/users/unblock")
async def unblock_user(request: BlockRequest, db: AsyncSession = Depends(get_db)):
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
    user.is_blocked = False
    await db.commit()
    return {"ok": True}

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(User).order_by(User.created_at.desc()))).scalars().all()
    return [
        {
            "id": u.id,
            "platform": u.platform,
            "platform_user_id": u.platform_user_id,
            "name": u.name,
            "username": u.username,
            "login": u.login,
            "is_blocked": u.is_blocked,
            "is_admin": u.is_admin,
            "created_at": u.created_at,
        }
        for u in users
    ]

@router.post("/users/{user_id}/make-admin")
async def make_admin(user_id: int, request: MakeAdminRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.platform == "web":
        user.is_admin = True
        await db.commit()
        return {"ok": True}

    login = (request.login or "").strip()
    password = (request.password or "").strip()
    if not login or not password:
        raise HTTPException(status_code=400, detail="Login and password are required")

    existing = (
        await db.execute(
            select(User).where(
                User.login == login,
                User.id != user_id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Login already taken")

    user.is_admin = True
    user.login = login
    user.password_hash = (
        await asyncio.to_thread(bcrypt.hashpw, password.encode(), bcrypt.gensalt())
    ).decode()
    await db.commit()
    return {"ok": True}

@router.post("/users/{user_id}/remove-admin")
async def remove_admin(user_id: int, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = False
    user.login = None
    user.password_hash = None
    await db.commit()
    return {"ok": True}
