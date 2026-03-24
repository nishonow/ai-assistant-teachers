from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])

class RegisterRequest(BaseModel):
    platform_user_id: str
    platform: str = "telegram"
    name: str = "User"
    username: str | None = None

@router.post("/register")
async def register_user(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = (
        await db.execute(
            select(User).where(
                User.platform_user_id == request.platform_user_id,
                User.platform == request.platform,
            )
        )
    ).scalar_one_or_none()

    if not user:
        user = User(
            platform=request.platform,
            platform_user_id=request.platform_user_id,
            name=request.name,
            username=request.username,
        )
        db.add(user)
        await db.commit()

    return {"ok": True}
