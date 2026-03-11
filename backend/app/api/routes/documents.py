from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Document, Chunk
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
    results = db.query(
        Document,
        func.count(Chunk.id).label("chunk_count")
    ).outerjoin(Chunk, Chunk.document_id == Document.id)\
     .group_by(Document.id)\
     .order_by(Document.created_at.desc())\
     .all()

    return [
        {
            "id": doc.id,
            "file_name": doc.file_name,
            "file_type": doc.file_type,
            "file_path": doc.file_path,
            "uploaded_by": doc.uploaded_by,
            "status": doc.status,
            "created_at": doc.created_at,
            "chunk_count": chunk_count,
        }
        for doc, chunk_count in results
    ]

@router.get("/{document_id}")
def get_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"id": document.id, "status": document.status, "file_name": document.file_name}

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(document)
    db.commit()
    return {"message": "Document deleted"}

@router.post("/{document_id}/reindex")
async def reindex_document(document_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    db.query(Chunk).filter(Chunk.document_id == document_id).delete()
    document.status = "pending"
    db.commit()

    background_tasks.add_task(process_document, document, db)

    return {"id": document.id, "status": "reindexing"}