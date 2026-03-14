from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import bcrypt
from app.config import settings
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Check .env super admin first
    if request.username == settings.ADMIN_USERNAME and request.password == settings.ADMIN_PASSWORD:
        token = jwt.encode(
            {"sub": request.username, "exp": datetime.utcnow() + timedelta(days=30)},
            settings.JWT_SECRET,
            algorithm="HS256"
        )
        return {"accessToken": token}

    # Check users table for admins
    user = db.query(User).filter(User.login == request.username, User.is_admin == True).first()
    if not user or not bcrypt.checkpw(request.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {"sub": request.username, "exp": datetime.utcnow() + timedelta(days=30)},
        settings.JWT_SECRET,
        algorithm="HS256"
    )
    return {"accessToken": token}