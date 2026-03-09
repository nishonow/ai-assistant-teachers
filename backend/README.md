# Backend

FastAPI backend for Legal AI Assistant.

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

3. Enable pgvector on your PostgreSQL:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. Run:
```bash
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/ask/ | Ask a question |
| GET | /api/v1/documents/ | List documents |
| POST | /api/v1/documents/upload | Upload document |
| DELETE | /api/v1/documents/{id} | Delete document |
| POST | /api/v1/documents/{id}/reindex | Reindex document |
| GET | /api/v1/admin/stats | Stats |