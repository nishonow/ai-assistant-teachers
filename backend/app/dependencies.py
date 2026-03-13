from fastapi import Header, HTTPException
from app.config import settings

async def require_admin(authorization: str = Header(...)):
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or token != settings.ADMIN_SECRET_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")