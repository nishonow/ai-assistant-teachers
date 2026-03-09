from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import User, Document, Chunk, Message

router = APIRouter(prefix="/admin", tags=["admin"])

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