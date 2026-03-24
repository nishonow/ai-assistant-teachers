import os

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models import Chunk, Document
from app.services.document_processor import process_document, save_file

router = APIRouter(prefix="/documents", tags=["documents"], dependencies=[Depends(require_admin)])

ALLOWED_TYPES = {"pdf", "txt", "docx"}


def _collect_uploads(file: UploadFile | None, files: list[UploadFile] | None) -> list[UploadFile]:
    uploads: list[UploadFile] = []
    if file is not None:
        uploads.append(file)
    if files:
        uploads.extend(files)
    return uploads


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile | None = File(default=None),
    files: list[UploadFile] | None = File(default=None),
    uploaded_by: str = "admin",
    db: AsyncSession = Depends(get_db),
):
    uploads = _collect_uploads(file, files)
    if not uploads:
        raise HTTPException(status_code=400, detail="At least one file is required")

    invalid_files = [
        upload.filename
        for upload in uploads
        if "." not in upload.filename or upload.filename.rsplit(".", 1)[-1].lower() not in ALLOWED_TYPES
    ]
    if invalid_files:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Use: {ALLOWED_TYPES}")

    saved_paths: list[str] = []
    created_documents: list[Document] = []
    try:
        for upload in uploads:
            file_name, file_path = await save_file(upload)
            saved_paths.append(file_path)

            document = Document(
                file_name=file_name,
                file_type=upload.filename.rsplit(".", 1)[-1].lower(),
                file_path=file_path,
                uploaded_by=uploaded_by,
                status="pending",
            )
            db.add(document)
            await db.flush()
            created_documents.append(document)

        await db.commit()
    except ValueError as exc:
        await db.rollback()
        for file_path in saved_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except OSError:
                pass
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        await db.rollback()
        for file_path in saved_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except OSError:
                pass
        raise

    for document in created_documents:
        background_tasks.add_task(process_document, document.id)

    if len(created_documents) == 1:
        document = created_documents[0]
        return {"id": document.id, "file_name": document.file_name, "status": document.status}

    return {
        "items": [
            {
                "id": document.id,
                "file_name": document.file_name,
                "status": document.status,
            }
            for document in created_documents
        ]
    }


@router.get("/")
async def get_documents(db: AsyncSession = Depends(get_db)):
    results = (
        await db.execute(
            select(
                Document,
                func.count(Chunk.id).label("chunk_count"),
            )
            .outerjoin(Chunk, Chunk.document_id == Document.id)
            .group_by(Document.id)
            .order_by(Document.created_at.desc())
        )
    ).all()

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
async def get_document(document_id: int, db: AsyncSession = Depends(get_db)):
    document = (await db.execute(select(Document).where(Document.id == document_id))).scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"id": document.id, "status": document.status, "file_name": document.file_name}


@router.delete("/{document_id}")
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    document = (await db.execute(select(Document).where(Document.id == document_id))).scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = document.file_path
    await db.delete(document)
    await db.commit()

    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass

    return {"message": "Document deleted"}


@router.post("/{document_id}/reindex")
async def reindex_document(document_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    document = (await db.execute(select(Document).where(Document.id == document_id))).scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.execute(delete(Chunk).where(Chunk.document_id == document_id))
    document.status = "pending"
    await db.commit()

    background_tasks.add_task(process_document, document.id)
    return {"id": document.id, "status": "reindexing"}


@router.get("/{document_id}/file")
async def get_document_file(document_id: int, db: AsyncSession = Depends(get_db)):
    document = (await db.execute(select(Document).where(Document.id == document_id))).scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=document.file_path,
        filename=document.file_name,
        media_type="application/octet-stream",
    )
