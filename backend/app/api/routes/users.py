from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])

class RegisterRequest(BaseModel):
    platform_user_id: str
    platform: str = "telegram"
    name: str = "User"
    username: str | None = None

@router.post("/register")
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.platform_user_id == request.platform_user_id,
        User.platform == request.platform
    ).first()

    if not user:
        user = User(
            platform=request.platform,
            platform_user_id=request.platform_user_id,
            name=request.name,
            username=request.username,
        )
        db.add(user)
        db.commit()

    return {"ok": True}