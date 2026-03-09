from fastapi import FastAPI
from app.database import engine
from app import models
from app.api.routes import documents, ask, admin

app = FastAPI(title="Legal AI Backend")

@app.on_event("startup")
async def startup():
    models.Base.metadata.create_all(bind=engine)

app.include_router(ask.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok"}