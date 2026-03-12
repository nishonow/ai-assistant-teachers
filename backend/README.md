# Mugallim AI — Backend

FastAPI backend for Mugallim AI, a legal assistant for teachers in Kyrgyzstan.
Handles RAG pipeline, document management, user registration, and blocking.

## Stack

- FastAPI + SQLAlchemy
- PostgreSQL + pgvector
- OpenAI (`text-embedding-3-small` + `gpt-4o-mini`)

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env`:
```
POSTGRES_URL=postgresql://user:password@host/dbname
OPENAI_API_KEY=sk-...
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
| POST | /api/v1/users/register | Register user on /start |
| POST | /api/v1/ask/ | Ask a question (RAG) |
| GET | /api/v1/documents/ | List documents |
| POST | /api/v1/documents/upload | Upload document |
| DELETE | /api/v1/documents/{id} | Delete document |
| POST | /api/v1/documents/{id}/reindex | Reindex document |
| GET | /api/v1/admin/stats | Usage stats |

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | All platform users (telegram, etc.) |
| `messages` | Message count per user for stats |
| `documents` | Uploaded documents |
| `chunks` | Document chunks with embeddings |

## Notes

- Users are registered on `/start`, not on first question
- Blocked users (`is_blocked=TRUE`) get 403 on `/ask`
- Language detection is automatic per question via GPT
- Deployed at `https://api2.nishonow.com`