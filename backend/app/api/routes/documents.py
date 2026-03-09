from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Document
from app.services.document_processor import save_file, process_document

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {"pdf", "txt", "doc", "docx"}

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    uploaded_by: str = "admin",
    db: Session = Depends(get_db)
):
    file_type = file.filename.split(".")[-1].lower()
    if file_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Use: {ALLOWED_TYPES}")

    file_name, file_path = await save_file(file)

    document = Document(
        file_name=file_name,
        file_type=file_type,
        file_path=file_path,
        uploaded_by=uploaded_by,
        status="pending"
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    background_tasks.add_task(process_document, document, db)

    return {"id": document.id, "file_name": file_name, "status": document.status}

@router.get("/")
def get_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).order_by(Document.created_at.desc()).all()
    return documents

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(document)
    db.commit()
    return {"message": "Document deleted"}