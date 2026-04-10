# Agents

## Project Overview

Mugallim AI is a trilingual (Kyrgyz, Russian, English) legal/practical assistant for teachers in Kyrgyzstan. Three modules share one PostgreSQL database with pgvector for embeddings.

## Module Entrypoints

- **Backend**: `backend/app/main.py` — FastAPI app, run with `uvicorn app.main:app --reload`
- **Frontend**: `frontend/` — React + Vite + TypeScript, run with `npm run dev`
- **Bot**: `bot/main.py` — Aiogram 3 bot, run with `python main.py`

## Commands

### Frontend
```bash
cd frontend
npm install
npm run dev          # dev server (default port 5173)
npm run build        # typecheck + build (tsc --noEmit && vite build)
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Bot
```bash
cd bot
pip install -r requirements.txt
python main.py
```

## Database

- PostgreSQL with `pgvector` extension required: `CREATE EXTENSION IF NOT EXISTS vector;`
- Schema is auto-created via SQLAlchemy `create_all()` on backend startup
- Vector dimension: 1536 (OpenAI `text-embedding-3-small`)
- Async driver: `asyncpg`

## Auth Architecture (important)

Web users and bot users are stored in the same `users` table but identified differently:
- **Web users**: `platform="web"`, `platform_user_id=email` (email is the user ID)
- **Telegram users**: `platform="telegram"`, `platform_user_id=TG_user_id`

Registration endpoints:
- Web: `POST /api/v1/auth/register`
- Telegram: `POST /api/v1/users/register`

JWT tokens use the email (web) or TG ID (bot) as the `sub` claim.

Admin can be either:
1. Built-in admin: credentials from `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars
2. DB admin: `User` row with `is_admin=True` and a `login`/`password_hash`

## Env Variables

### Backend (`backend/.env`)
```
POSTGRES_URL=postgresql://user:pass@host/db
OPENAI_API_KEY=sk-...
ADMIN_SECRET_TOKEN=...      # used by bot to call admin APIs
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
JWT_SECRET=...
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://127.0.0.1:8000  # defaults to https://api2.nishonow.com in prod
```

### Bot (`bot/.env`)
```
BOT_TOKEN=...
POSTGRES_URL=...
BACKEND_URL=http://127.0.0.1:8000
ADMIN_SECRET_TOKEN=...       # must match backend
ADMIN_IDS=[123456789]        # JSON array of Telegram user IDs
```

## CORS

Backend CORS allows: `http://localhost`, `http://localhost:5173`, `http://127.0.0.1`, `http://127.0.0.1:5173`, `https://ai-assistant-teachers.vercel.app`

## Frontend Notes

- TypeScript strict mode enabled (`noUnusedLocals`, `noUnusedParameters`)
- Service worker: unregisters itself in dev to avoid stale cache issues
- No ESLint/Prettier configured

## Backend Notes

- Rate limiting on `/api/v1/ask/`: 5 requests per 60 seconds per user
- Audio transcription via OpenAI `gpt-4o-mini-transcribe`, max 15MB
- Bot communicates with backend using `admin_secret_token` as Bearer auth
