from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from collections import defaultdict
from time import time
from app.database import get_db
from app.models import User
from app.services.rag import ask

router = APIRouter(prefix="/ask", tags=["ask"])

RATE_LIMIT = 5
RATE_WINDOW = 60

_request_counts: dict[str, list[float]] = defaultdict(list)

PLATFORMS_WITH_START = {"telegram"}

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

@router.post("/")
def ask_question(request: AskRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.platform_user_id == request.platform_user_id,
        User.platform == request.platform
    ).first()

    if not user:
        if request.platform in PLATFORMS_WITH_START:
            raise HTTPException(status_code=404, detail="User not found")
        user = User(
            platform=request.platform,
            platform_user_id=request.platform_user_id,
            name=request.name,
            username=request.username,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if user.is_blocked:
        raise HTTPException(status_code=403, detail="User is blocked")

    _check_rate_limit(f"{request.platform}:{request.platform_user_id}")

    result = ask(
        question=request.question,
        user_id=user.id,
        platform=request.platform,
        history=[m.model_dump() for m in request.history],
        db=db
    )

    return {
        "answer": result["answer"],
        "sources": result["sources"]
    }