import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_web_user
from app.models import ChatConversation, ChatConversationMessage, ChatConversationMessageSource, Document, User

router = APIRouter(prefix="/conversations", tags=["conversations"])


class ConversationSourceRequest(BaseModel):
    documentId: int | None = None
    pageNumber: int | None = None
    title: str
    snippet: str


class ConversationCreateRequest(BaseModel):
    title: str | None = None


class ConversationRenameRequest(BaseModel):
    title: str


class ConversationExchangeRequest(BaseModel):
    question: str
    answer: str
    title: str | None = None
    sources: list[ConversationSourceRequest] = []


def _serialize_summary(conversation: ChatConversation) -> dict:
    last_message = conversation.messages[-1].content if conversation.messages else ""
    return {
        "id": str(conversation.id),
        "title": conversation.title,
        "updatedAt": conversation.updated_at.isoformat() if conversation.updated_at else "",
        "lastMessagePreview": last_message[:120],
        "messageCount": len(conversation.messages),
    }


def _serialize_detail(conversation: ChatConversation) -> dict:
    return {
        "id": str(conversation.id),
        "title": conversation.title,
        "updatedAt": conversation.updated_at.isoformat() if conversation.updated_at else "",
        "messages": [
            {
                "id": str(message.id),
                "role": message.role,
                "content": message.content,
                "createdAt": message.created_at.isoformat() if message.created_at else "",
                "sources": [
                    {
                        "id": str(source.id),
                        "documentId": source.document_id,
                        "pageNumber": source.page_number,
                        "title": source.title,
                        "snippet": source.snippet,
                    }
                    for source in message.sources
                ],
            }
            for message in conversation.messages
        ],
    }


def _conversation_load_options():
    return [
        selectinload(ChatConversation.messages).selectinload(ChatConversationMessage.sources),
    ]


async def _get_user_conversation(db: AsyncSession, conversation_id: int, user_id: int) -> ChatConversation:
    conversation = (
        await db.execute(
            select(ChatConversation)
            .options(*_conversation_load_options())
            .where(
                ChatConversation.id == conversation_id,
                ChatConversation.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.get("/")
async def list_conversations(current_user: User = Depends(require_web_user), db: AsyncSession = Depends(get_db)):
    conversations = (
        await db.execute(
            select(ChatConversation)
            .options(*_conversation_load_options())
            .where(ChatConversation.user_id == current_user.id)
            .order_by(desc(ChatConversation.updated_at), desc(ChatConversation.id))
        )
    ).scalars().all()
    return [_serialize_summary(conversation) for conversation in conversations]


@router.post("/")
async def create_conversation(
    request: ConversationCreateRequest,
    current_user: User = Depends(require_web_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = ChatConversation(user_id=current_user.id, title=(request.title or "New chat").strip() or "New chat")
    db.add(conversation)
    await db.commit()
    return _serialize_detail(await _get_user_conversation(db, conversation.id, current_user.id))


@router.delete("/")
async def delete_all_conversations(current_user: User = Depends(require_web_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(ChatConversation).where(ChatConversation.user_id == current_user.id))
    await db.commit()
    return {"ok": True}


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: int, current_user: User = Depends(require_web_user), db: AsyncSession = Depends(get_db)):
    conversation = await _get_user_conversation(db, conversation_id, current_user.id)
    return _serialize_detail(conversation)


@router.get("/{conversation_id}/sources/{document_id}/download")
async def download_conversation_source(
    conversation_id: int,
    document_id: int,
    current_user: User = Depends(require_web_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _get_user_conversation(db, conversation_id, current_user.id)
    has_cited_document = any(
        source.document_id == document_id
        for message in conversation.messages
        for source in message.sources
    )
    if not has_cited_document:
        raise HTTPException(status_code=404, detail="Source not found in this conversation")

    document = (await db.execute(select(Document).where(Document.id == document_id))).scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    media_type = "application/octet-stream"
    if document.file_type == "pdf":
        media_type = "application/pdf"
    elif document.file_type == "txt":
        media_type = "text/plain"

    return FileResponse(
        path=document.file_path,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{document.file_name}"'},
    )


@router.patch("/{conversation_id}")
async def rename_conversation(
    conversation_id: int,
    request: ConversationRenameRequest,
    current_user: User = Depends(require_web_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _get_user_conversation(db, conversation_id, current_user.id)
    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    conversation.title = title[:120]
    conversation.updated_at = func.now()
    await db.commit()

    refreshed = await _get_user_conversation(db, conversation.id, current_user.id)
    return _serialize_detail(refreshed)


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(require_web_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _get_user_conversation(db, conversation_id, current_user.id)
    await db.delete(conversation)
    await db.commit()
    return {"ok": True}


@router.post("/{conversation_id}/exchange")
async def save_exchange(
    conversation_id: int,
    request: ConversationExchangeRequest,
    current_user: User = Depends(require_web_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _get_user_conversation(db, conversation_id, current_user.id)

    question = request.question.strip()
    answer = request.answer.strip()
    if not question or not answer:
        raise HTTPException(status_code=400, detail="Question and answer are required")

    user_message = ChatConversationMessage(
        conversation_id=conversation.id,
        role="user",
        content=question,
    )
    assistant_message = ChatConversationMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=answer,
    )
    db.add(user_message)
    db.add(assistant_message)
    await db.flush()

    for source in request.sources:
        db.add(
            ChatConversationMessageSource(
                message_id=assistant_message.id,
                document_id=source.documentId,
                page_number=source.pageNumber,
                title=source.title.strip(),
                snippet=source.snippet.strip(),
            )
        )

    if request.title is not None:
        next_title = request.title.strip()
        if next_title:
            conversation.title = next_title

    conversation.updated_at = func.now()
    await db.commit()

    db.expunge_all()
    refreshed = await _get_user_conversation(db, conversation.id, current_user.id)
    return _serialize_detail(refreshed)
