from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
import jwt
from app.config import settings
from app.database import get_db
from app.models import User

async def require_admin(authorization: str = Header(...), db: Session = Depends(get_db)):
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Unauthorized")

    if token == settings.ADMIN_SECRET_TOKEN:
        return

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if subject == settings.ADMIN_USERNAME:
        return

    admin_user = db.query(User).filter(User.login == subject, User.is_admin == True).first()
    if not admin_user:
        raise HTTPException(status_code=403, detail="Admin access required")
