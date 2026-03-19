# Backend

FastAPI backend for Mugallim AI.

It handles:
- web and admin authentication
- Telegram-compatible APIs
- document upload and indexing
- saved web conversations
- RAG question answering
- admin endpoints

## Main Areas

- `auth` - login, register, session
- `users` - platform user registration
- `documents` - upload, list, delete, reindex, download
- `conversations` - saved chat history and sources
- `ask` / `services/rag.py` - retrieval and answer generation
- `admin` - stats and moderation actions

## Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `.env` in `backend/`:

```env
POSTGRES_URL=postgresql://user:password@host/dbname
OPENAI_API_KEY=sk-...
ADMIN_SECRET_TOKEN=your-bot-static-token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
```

Enable pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run:

```bash
uvicorn app.main:app --reload
```

## Notes

- web users register through `/api/v1/auth/register`
- Telegram users register through bot flow and `/api/v1/users/register`
- web conversations and assistant sources are stored in dedicated chat tables
- schema is currently created with SQLAlchemy `create_all()`
