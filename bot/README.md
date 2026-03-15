# Mugallim AI — Telegram Bot

Aiogram 3 Telegram bot for Mugallim AI, a legal assistant for teachers in Kyrgyzstan.

## Stack

- Aiogram 3
- asyncpg (bot_users table)
- httpx (backend communication)

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env`:
```
BOT_TOKEN=...
POSTGRES_URL=postgresql://user:password@host/dbname
BACKEND_URL=<your-backend-base-url>
ADMIN_IDS=[123456789]
ADMIN_SECRET_TOKEN=your-bot-static-token
```

3. Make sure backend is running.

4. Run:
```bash
python main.py
```

## Features

- RAG-powered Q&A via backend
- Animated thinking indicator
- FSM-based chat history (last 5 exchanges)
- Russian / Kyrgyz interface language
- Response language follows user's question language
- Source document citations as clickable deep links
- Blocked user handling (403 -> friendly message)
- Rate limit feedback (429 -> friendly message)
- Admin panel: upload, delete, reindex docs, view stats, block/unblock users with pagination
