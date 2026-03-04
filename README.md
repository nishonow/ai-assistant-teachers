# AI assistant for teachers

This bot answers legal questions using your uploaded documents (RAG).

## Environment

Create `.env` with:

BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_api_key
POSTGRES_URL=postgresql://postgres:password$@localhost/legalai
ADMIN_IDS=[131231, 31312312]

## Install and run

1. Install dependencies:

	`pip install -r requirements.txt`

2. Start bot:

	`python main.py`

## One-time full database reset (production prep)

If you need a clean database before production launch:

1. Open [main.py](main.py).
2. Uncomment this line:

	`# await reset_database_on_startup(db)`

3. Run the bot once.
4. Comment that line again.

What reset does:

- Clears all rows from `users`, `documents`, `chunks`.
- Resets IDs (`RESTART IDENTITY`).
- Keeps table structure and constraints intact.

So after reset, the database is clean like a fresh start, and tables remain correctly created and ready to use.