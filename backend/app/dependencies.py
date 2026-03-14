from fastapi import Header, HTTPException
import jwt
from app.config import settings

async def require_admin(authorization: str = Header(...)):
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Unauthorized")

    if token == settings.ADMIN_SECRET_TOKEN:
        return

    try:
        jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")