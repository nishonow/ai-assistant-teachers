# Mugallim AI â€” Backend

FastAPI backend for Mugallim AI, a legal assistant for teachers in Kyrgyzstan.

## Stack

- FastAPI + SQLAlchemy
- PostgreSQL + pgvector
- OpenAI (`text-embedding-3-small` + `gpt-4o-mini`)
- lingua-language-detector
- bcrypt

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env`:
```
POSTGRES_URL=postgresql://user:password@host/dbname
OPENAI_API_KEY=sk-...
ADMIN_SECRET_TOKEN=your-bot-static-token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
```

3. Enable pgvector:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. Run:
```bash
uvicorn app.main:app --reload
```

## API Scope

- Authentication for admin users
- User registration and management
- RAG question answering
- Document upload, listing, download, delete, and reindex
- Admin stats and moderation actions

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | All platform users (telegram, web, etc.) |
| `bot_users` | Telegram-specific data (lang preference) |
| `messages` | Message count + question per user for stats |
| `documents` | Uploaded documents |
| `chunks` | Document chunks with embeddings |

## Auth

- Admin endpoints require bearer token auth
- Web admin panel uses JWT auth
- Telegram bot uses static admin token from `.env`
- Both token types are accepted on protected endpoints
- Super admin credentials are in `.env`, additional admins managed via web panel

## Notes

- Telegram users register when they start chat, other platforms auto-register on first message
- Blocked users get 403 on question requests
- Rate limit: 5 requests per 60 seconds per user
- File uploads: max 20MB, supported formats: pdf, txt, docx
