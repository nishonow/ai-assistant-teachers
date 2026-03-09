# AI Assistant for Teachers (Kyrgyzstan)

Legal AI assistant for teachers in Kyrgyzstan. Answers questions based on labor law documents.

## Structure
```
ai-assistant-teachers/
├── backend/    # FastAPI — RAG pipeline, document management, API
├── bot/        # Aiogram Telegram bot
└── docker-compose.yml
```

## Stack

- **Backend:** FastAPI, PostgreSQL + pgvector, OpenAI
- **Bot:** Aiogram 3, asyncpg, httpx

## Quick Start

See `backend/README.md` and `bot/README.md` for setup instructions.