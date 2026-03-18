from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


def _create_access_token(subject: str) -> str:
    return jwt.encode(
        {"sub": subject, "exp": datetime.utcnow() + timedelta(days=30)},
        settings.JWT_SECRET,
        algorithm="HS256",
    )


def _build_auth_response(*, token: str, role: str, user_id: str, username: str, display_name: str) -> dict:
    return {
        "accessToken": token,
        "role": role,
        "user": {
            "id": user_id,
            "username": username,
            "displayName": display_name,
        },
    }


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    name = request.name.strip() or "User"

    existing = db.query(User).filter(User.platform == "web", User.platform_user_id == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        platform="web",
        platform_user_id=email,
        name=name,
        username=email,
        is_admin=False,
        password_hash=bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode(),
    )
    db.add(user)
    db.commit()

    token = _create_access_token(email)
    return _build_auth_response(token=token, role="user", user_id=email, username=email, display_name=name)


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    identifier = request.username.strip()
    password = request.password

    if identifier == settings.ADMIN_USERNAME and password == settings.ADMIN_PASSWORD:
        token = _create_access_token(identifier)
        return _build_auth_response(
            token=token,
            role="admin",
            user_id=identifier,
            username=identifier,
            display_name=identifier,
        )

    admin_user = db.query(User).filter(User.login == identifier, User.is_admin == True).first()
    if admin_user and admin_user.password_hash and bcrypt.checkpw(password.encode(), admin_user.password_hash.encode()):
        token = _create_access_token(identifier)
        return _build_auth_response(
            token=token,
            role="admin",
            user_id=str(admin_user.id),
            username=identifier,
            display_name=admin_user.name or identifier,
        )

    normalized_email = identifier.lower()
    web_user = db.query(User).filter(User.platform == "web", User.platform_user_id == normalized_email).first()
    if web_user and web_user.password_hash and bcrypt.checkpw(password.encode(), web_user.password_hash.encode()):
        token = _create_access_token(normalized_email)
        return _build_auth_response(
            token=token,
            role="user",
            user_id=normalized_email,
            username=normalized_email,
            display_name=web_user.name or normalized_email,
        )

    raise HTTPException(status_code=401, detail="Invalid credentials")
