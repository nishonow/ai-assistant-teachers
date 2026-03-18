from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
import bcrypt
from app.database import get_db
from app.models import User, Document, Chunk, Message
from app.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

class BlockRequest(BaseModel):
    platform_user_id: str
    platform: str = "telegram"

class MakeAdminRequest(BaseModel):
    login: str | None = None
    password: str | None = None

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar()
    total_messages = db.query(func.count(Message.id)).scalar()
    total_documents = db.query(func.count(Document.id)).scalar()
    total_chunks = db.query(func.count(Chunk.id)).scalar()

    messages_by_platform = db.query(
        Message.platform,
        func.count(Message.id)
    ).group_by(Message.platform).all()

    return {
        "total_users": total_users,
        "total_messages": total_messages,
        "total_documents": total_documents,
        "total_chunks": total_chunks,
        "by_platform": {platform: count for platform, count in messages_by_platform},
    }

@router.post("/users/block")
def block_user(request: BlockRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.platform_user_id == request.platform_user_id,
        User.platform == request.platform
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_blocked = True
    db.commit()
    return {"ok": True}

@router.post("/users/unblock")
def unblock_user(request: BlockRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.platform_user_id == request.platform_user_id,
        User.platform == request.platform
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_blocked = False
    db.commit()
    return {"ok": True}

@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
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
def make_admin(user_id: int, request: MakeAdminRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.platform == "web":
        user.is_admin = True
        db.commit()
        return {"ok": True}

    login = (request.login or "").strip()
    password = (request.password or "").strip()
    if not login or not password:
        raise HTTPException(status_code=400, detail="Login and password are required")
    if db.query(User).filter(User.login == login, User.id != user_id).first():
        raise HTTPException(status_code=400, detail="Login already taken")

    user.is_admin = True
    user.login = login
    user.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    db.commit()
    return {"ok": True}

@router.post("/users/{user_id}/remove-admin")
def remove_admin(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = False
    user.login = None
    user.password_hash = None
    db.commit()
    return {"ok": True}
