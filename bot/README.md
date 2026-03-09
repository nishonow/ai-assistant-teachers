# Telegram Bot

Aiogram 3 Telegram bot for Legal AI Assistant.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env`:
```
BOT_TOKEN=...
POSTGRES_URL=postgresql://user:password@host/dbname
ADMIN_IDS=[123456789]
```

3. Make sure backend is running at `http://localhost:8000`

4. Run:
```bash
python main.py
```