import asyncio
from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_token_subject_from_authorization
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class UpdateProfileRequest(BaseModel):
    name: str
    email: EmailStr
    password: str | None = None


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


async def _resolve_auth_subject(subject: str, db: AsyncSession) -> dict:
    if subject == settings.ADMIN_USERNAME:
        return _build_auth_response(
            token="",
            role="admin",
            user_id=subject,
            username=subject,
            display_name=subject,
        )

    admin_user = (
        await db.execute(
            select(User).where(
                User.login == subject,
                User.is_admin == True,
            )
        )
    ).scalar_one_or_none()
    if admin_user:
        return _build_auth_response(
            token="",
            role="admin",
            user_id=subject,
            username=subject,
            display_name=admin_user.name or subject,
        )

    web_user = (
        await db.execute(
            select(User).where(
                User.platform == "web",
                User.platform_user_id == subject,
            )
        )
    ).scalar_one_or_none()
    if web_user:
        return _build_auth_response(
            token="",
            role="admin" if web_user.is_admin else "user",
            user_id=subject,
            username=subject,
            display_name=web_user.name or subject,
        )

    raise HTTPException(status_code=404, detail="User not found")


@router.post("/register")
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    email = request.email.strip().lower()
    name = request.name.strip() or "User"

    existing = (
        await db.execute(
            select(User).where(
                User.platform == "web",
                User.platform_user_id == email,
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = (
        await asyncio.to_thread(bcrypt.hashpw, request.password.encode(), bcrypt.gensalt())
    ).decode()
    user = User(
        platform="web",
        platform_user_id=email,
        name=name,
        username=email,
        is_admin=False,
        password_hash=password_hash,
    )
    db.add(user)
    await db.commit()

    token = _create_access_token(email)
    return _build_auth_response(token=token, role="user", user_id=email, username=email, display_name=name)


@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
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

    admin_user = (
        await db.execute(
            select(User).where(
                User.login == identifier,
                User.is_admin == True,
            )
        )
    ).scalar_one_or_none()
    if admin_user and admin_user.password_hash:
        is_valid = await asyncio.to_thread(
            bcrypt.checkpw,
            password.encode(),
            admin_user.password_hash.encode(),
        )
        if is_valid:
            token = _create_access_token(identifier)
            return _build_auth_response(
                token=token,
                role="admin",
                user_id=identifier,
                username=identifier,
                display_name=admin_user.name or identifier,
            )

    normalized_email = identifier.lower()
    web_user = (
        await db.execute(
            select(User).where(
                User.platform == "web",
                User.platform_user_id == normalized_email,
            )
        )
    ).scalar_one_or_none()
    if web_user and web_user.password_hash:
        is_valid = await asyncio.to_thread(
            bcrypt.checkpw,
            password.encode(),
            web_user.password_hash.encode(),
        )
        if is_valid:
            token = _create_access_token(normalized_email)
            return _build_auth_response(
                token=token,
                role="admin" if web_user.is_admin else "user",
                user_id=normalized_email,
                username=normalized_email,
                display_name=web_user.name or normalized_email,
            )

    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/me")
async def me(authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    subject = get_token_subject_from_authorization(authorization)
    response = await _resolve_auth_subject(subject, db)
    response["accessToken"] = authorization.split(" ", 1)[1]
    return response


@router.patch("/me")
@router.post("/me")
async def update_me(request: UpdateProfileRequest, authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    subject = get_token_subject_from_authorization(authorization)
    name = request.name.strip()
    email = request.email.strip().lower()
    password = (request.password or "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    if subject == settings.ADMIN_USERNAME:
        raise HTTPException(status_code=400, detail="Built-in admin profile cannot be edited here")

    user = (
        await db.execute(
            select(User).where(
                User.platform == "web",
                User.platform_user_id == subject,
            )
        )
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="This profile cannot be edited here")

    existing = (
        await db.execute(
            select(User).where(
                User.platform == "web",
                User.platform_user_id == email,
            )
        )
    ).scalar_one_or_none()
    if existing and existing.id != user.id:
        raise HTTPException(status_code=400, detail="Email already registered")

    user.platform_user_id = email
    user.username = email
    user.name = name
    if password:
        user.password_hash = (
            await asyncio.to_thread(bcrypt.hashpw, password.encode(), bcrypt.gensalt())
        ).decode()
    await db.commit()
    await db.refresh(user)

    token = _create_access_token(email)
    return _build_auth_response(
        token=token,
        role="admin" if user.is_admin else "user",
        user_id=email,
        username=email,
        display_name=user.name or email,
    )
