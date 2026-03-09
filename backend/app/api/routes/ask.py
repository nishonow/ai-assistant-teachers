from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User
from app.services.rag import ask

router = APIRouter(prefix="/ask", tags=["ask"])

class HistoryMessage(BaseModel):
    role: str
    content: str

class AskRequest(BaseModel):
    question: str
    platform_user_id: str
    platform: str = "telegram"
    name: str = "User"
    username: str = None
    history: list[HistoryMessage] = []

@router.post("/")
def ask_question(request: AskRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.platform_user_id == request.platform_user_id,
        User.platform == request.platform
    ).first()

    if not user:
        user = User(
            platform=request.platform,
            platform_user_id=request.platform_user_id,
            name=request.name,
            username=request.username
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    answer = ask(
        question=request.question,
        user_id=user.id,
        platform=request.platform,
        history=[m.model_dump() for m in request.history],
        db=db
    )

    return {"answer": answer}