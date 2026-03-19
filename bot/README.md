# Telegram Bot

Aiogram bot for Mugallim AI.

The bot uses the backend for question answering and source retrieval.

## Features

- asks questions through backend RAG
- supports Russian and Kyrgyz UI
- shows sources from backend answers
- supports bot-side admin actions

## Setup

```bash
cd bot
pip install -r requirements.txt
```

Create `.env` in `bot/`:

```env
BOT_TOKEN=...
POSTGRES_URL=postgresql://user:password@host/dbname
BACKEND_URL=http://127.0.0.1:8000
ADMIN_IDS=[123456789]
ADMIN_SECRET_TOKEN=your-bot-static-token
```

Run:

```bash
python main.py
```

## Notes

- bot uses the same backend knowledge base as the web app
- bot admin flow is separate from the web admin UI
