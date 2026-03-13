from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Document, Chunk, Message
from app.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

class BlockRequest(BaseModel):
    platform_user_id: str
    platform: str = "telegram"

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
            "is_blocked": u.is_blocked,
            "created_at": u.created_at,
        }
        for u in users
    ]