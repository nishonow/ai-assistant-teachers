import asyncio
import logging
from collections import defaultdict
from time import time

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import SessionLocal, get_db
from app.dependencies import get_token_subject_from_authorization, require_web_user
from app.models import ChatConversation, User
from app.services.rag import ask
from app.services.title import generate_chat_title

router = APIRouter(prefix="/ask", tags=["ask"])
logger = logging.getLogger(__name__)

RATE_LIMIT = 5
RATE_WINDOW = 60

_request_counts: dict[str, list[float]] = defaultdict(list)
stt_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe"
MAX_AUDIO_BYTES = 15 * 1024 * 1024
ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "video/webm",
    "video/mp4",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/mpeg",
    "audio/ogg",
    "application/octet-stream",
}


class HistoryMessage(BaseModel):
    role: str
    content: str


class AskRequest(BaseModel):
    question: str
    platform_user_id: str
    platform: str = "telegram"
    name: str = "User"
    username: str | None = None
    history: list[HistoryMessage] = Field(default_factory=list)
    conversation_id: str | None = None


class TranscriptionResponse(BaseModel):
    text: str


def _check_rate_limit(key: str) -> None:
    now = time()
    timestamps = _request_counts[key]
    _request_counts[key] = [t for t in timestamps if now - t < RATE_WINDOW]
    if len(_request_counts[key]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429, detail="Rate limit exceeded. Try again later."
        )
    _request_counts[key].append(now)


async def _resolve_user(
    request: AskRequest, db: AsyncSession, authorization: str | None
) -> User:
    if request.platform == "web":
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")

        subject = get_token_subject_from_authorization(authorization)
        if subject != request.platform_user_id:
            raise HTTPException(status_code=403, detail="User mismatch")
        user = (
            await db.execute(
                select(User).where(
                    User.platform == "web",
                    User.platform_user_id == subject,
                )
            )
        ).scalar_one_or_none()
        if not user:
            user = (
                await db.execute(
                    select(User).where(
                        User.login == subject,
                        User.is_admin == True,
                    )
                )
            ).scalar_one_or_none()
    else:
        user = (
            await db.execute(
                select(User).where(
                    User.platform_user_id == request.platform_user_id,
                    User.platform == request.platform,
                )
            )
        ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


async def _update_conversation_title(
    conversation_id: str | None, question: str, user_id: int
) -> None:
    if not conversation_id:
        return

    normalized_question = question.strip()
    if not normalized_question:
        return

    generated_title = await generate_chat_title(normalized_question)

    async with SessionLocal() as title_db:
        conv = (
            await title_db.execute(
                select(ChatConversation).where(
                    ChatConversation.uuid == conversation_id,
                    ChatConversation.user_id == user_id,
                )
            )
        ).scalar_one_or_none()

        if not conv:
            return

        if (conv.title or "").strip().lower() != "new chat":
            return

        conv.title = generated_title[:120]
        conv.updated_at = func.now()
        await title_db.commit()


def _log_background_task_exception(task: asyncio.Task) -> None:
    try:
        task.result()
    except asyncio.CancelledError:
        return
    except Exception:
        logger.exception("background title update failed")


@router.post("/")
async def ask_question(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
):
    user = await _resolve_user(request, db, authorization)

    if user.is_blocked:
        raise HTTPException(status_code=403, detail="User is blocked")

    _check_rate_limit(f"{request.platform}:{request.platform_user_id}")

    title_task: asyncio.Task | None = None
    if request.conversation_id:
        title_task = asyncio.create_task(
            _update_conversation_title(
                request.conversation_id,
                request.question,
                user.id,
            )
        )
        title_task.add_done_callback(_log_background_task_exception)

    try:
        result = await ask(
            question=request.question,
            user_id=user.id,
            platform=request.platform,
            history=[m.model_dump() for m in request.history],
            db=db,
        )
    except Exception:
        if title_task and not title_task.done():
            title_task.cancel()
        logger.exception("ask processing failed")
        raise HTTPException(status_code=500, detail="Failed to process question")

    response_data = {
        "answer": result["answer"],
        "sources": result["sources"],
    }

    if request.conversation_id:
        conv = (
            await db.execute(
                select(ChatConversation).where(
                    ChatConversation.uuid == request.conversation_id,
                    ChatConversation.user_id == user.id,
                )
            )
        ).scalar_one_or_none()
        if conv:
            response_data["title"] = conv.title
            response_data["conversationId"] = conv.uuid

    return response_data


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(require_web_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Audio file is required")

    normalized_content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    if normalized_content_type and (
        normalized_content_type not in ALLOWED_AUDIO_TYPES
        and not normalized_content_type.startswith("audio/")
        and not normalized_content_type.startswith("video/")
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {normalized_content_type}",
        )

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio is empty")

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Audio is too large")

    _check_rate_limit(f"transcribe:web:{current_user.platform_user_id}")

    try:
        transcription = await stt_client.audio.transcriptions.create(
            model=TRANSCRIBE_MODEL,
            file=(
                file.filename or "recording.webm",
                audio_bytes,
                normalized_content_type or "audio/webm",
            ),
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Transcription service unavailable")

    text = (getattr(transcription, "text", "") or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="Could not transcribe audio")

    return TranscriptionResponse(text=text)
