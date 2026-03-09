import os
import aiofiles
from sqlalchemy.orm import Session
from app.models import Document, Chunk
from app.services.chunking import split_text
from app.services.embeddings import embed_chunks

UPLOAD_DIR = "uploads"

async def save_file(file) -> tuple[str, str]:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
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
    elif file_type in ("doc", "docx"):
        import docx
        doc = docx.Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs])
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

async def process_document(document: Document, db: Session):
    try:
        document.status = "processing"
        db.commit()

        text = extract_text(document.file_path, document.file_type)
        chunks = split_text(text)
        embeddings = embed_chunks(chunks)

        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            db.add(Chunk(
                document_id=document.id,
                chunk_index=i,
                chunk_text=chunk_text,
                embedding=embedding
            ))

        document.status = "indexed"
        db.commit()

    except Exception as e:
        document.status = "failed"
        db.commit()
        raise e