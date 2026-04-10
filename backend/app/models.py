import uuid as _uuid

from sqlalchemy import Column, BigInteger, Text, Integer, ForeignKey, TIMESTAMP, Boolean, UniqueConstraint, func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("platform", "platform_user_id"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    platform = Column(Text, nullable=False, default="telegram")
    platform_user_id = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    username = Column(Text)
    is_blocked = Column(Boolean, nullable=False, default=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    login = Column(Text, nullable=True)
    password_hash = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class Document(Base):
    __tablename__ = "documents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    file_name = Column(Text, nullable=False)
    file_type = Column(Text, nullable=False)
    file_path = Column(Text, nullable=False)
    uploaded_by = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="pending")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    chunks = relationship("Chunk", back_populates="document", cascade="all, delete")

class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    document_id = Column(BigInteger, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=True)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="chunks")

class Message(Base):
    __tablename__ = "messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    platform = Column(Text, nullable=False)
    question = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    uuid = Column(Text, nullable=False, unique=True, default=lambda: str(_uuid.uuid4()))
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    title = Column(Text, nullable=False, default="New chat")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    messages = relationship(
        "ChatConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatConversationMessage.id",
    )


class ChatConversationMessage(Base):
    __tablename__ = "chat_conversation_messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    conversation_id = Column(BigInteger, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    conversation = relationship("ChatConversation", back_populates="messages")
    sources = relationship(
        "ChatConversationMessageSource",
        back_populates="message",
        cascade="all, delete-orphan",
        order_by="ChatConversationMessageSource.id",
    )


class ChatConversationMessageSource(Base):
    __tablename__ = "chat_conversation_message_sources"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    message_id = Column(BigInteger, ForeignKey("chat_conversation_messages.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(BigInteger, nullable=True)
    page_number = Column(Integer, nullable=True)
    title = Column(Text, nullable=False)
    snippet = Column(Text, nullable=False)

    message = relationship("ChatConversationMessage", back_populates="sources")
