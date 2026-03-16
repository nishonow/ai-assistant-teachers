import os
import uuid
import aiofiles
from app.models import Document, Chunk
from app.services.chunking import split_text
from app.services.embeddings import embed_chunks
from app.database import SessionLocal

UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 20 * 1024 * 1024

async def save_file(file) -> tuple[str, str]:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("File too large. Max 20MB.")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1].lower()
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    return file.filename, file_path

def extract_text(file_path: str, file_type: str) -> str:
    if file_type == "txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif file_type == "pdf":
        import pdfplumber
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text
    elif file_type == "docx":
        import docx
        doc = docx.Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs])
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

async def process_document(document_id: int):
    session = SessionLocal()
    try:
        document = session.query(Document).filter(Document.id == document_id).first()
        if not document:
            return

        document.status = "processing"
        session.commit()

        text = extract_text(document.file_path, document.file_type)
        chunks = split_text(text)

        prefixed_chunks = [f"Document: {document.file_name}\n{chunk}" for chunk in chunks]
        embeddings = embed_chunks(prefixed_chunks)

        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            session.add(Chunk(
                document_id=document.id,
                chunk_index=i,
                chunk_text=chunk_text,
                embedding=embedding
            ))

        document.status = "indexed"
        session.commit()

    except Exception as e:
        session.rollback()
        document = session.query(Document).filter(Document.id == document_id).first()
        if document:
            document.status = "failed"
            session.commit()
        raise e
    finally:
        session.close()