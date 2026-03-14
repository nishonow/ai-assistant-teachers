# Mugallim AI — Backend

FastAPI backend for Mugallim AI, a legal assistant for teachers in Kyrgyzstan.
Handles RAG pipeline, document management, user registration, blocking, and admin auth.

## Stack

- FastAPI + SQLAlchemy
- PostgreSQL + pgvector
- OpenAI (`text-embedding-3-small` + `gpt-4o-mini`)
- lingua-language-detector

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

Docs at `http://localhost:8000/docs`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/login | Admin login → JWT token |
| POST | /api/v1/users/register | Register user on /start |
| POST | /api/v1/ask/ | Ask a question (RAG) |
| GET | /api/v1/documents/ | List documents |
| POST | /api/v1/documents/upload | Upload document |
| DELETE | /api/v1/documents/{id} | Delete document |
| POST | /api/v1/documents/{id}/reindex | Reindex document |
| GET | /api/v1/documents/{id}/file | Download document file |
| GET | /api/v1/admin/stats | Usage stats |
| GET | /api/v1/admin/users | List users |
| POST | /api/v1/admin/users/block | Block user |
| POST | /api/v1/admin/users/unblock | Unblock user |

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | All platform users (telegram, web, etc.) |
| `bot_users` | Telegram-specific data (lang preference) |
| `messages` | Message count + question per user for stats |
| `documents` | Uploaded documents |
| `chunks` | Document chunks with embeddings |

## Auth

- Admin endpoints require `Authorization: Bearer <token>`
- Web admin panel uses JWT via `POST /api/v1/auth/login`
- Telegram bot uses static `ADMIN_SECRET_TOKEN` from `.env`

## Notes

- Telegram users register on `/start`, other platforms auto-register on first message
- Blocked users (`is_blocked=TRUE`) get 403 on `/ask`
- Response language auto-detected from question via lingua
- Rate limit: 5 requests per 60 seconds per user
- Deployed at `https://api2.nishonow.com`