import os
import re
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


def clean_text(text: str) -> str:
    text = re.sub(r'cbd\.minjust\.gov\.kg', '', text)
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()


def extract_text(file_path: str, file_type: str) -> str:
    if file_type == "txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return clean_text(f.read())

    elif file_type == "pdf":
        import pdfplumber
        pages = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    pages.append(page_text.strip())
        return clean_text("\n\n".join(pages))

    elif file_type == "docx":
        import docx
        doc = docx.Document(file_path)
        parts = []

        for para in doc.paragraphs:
            if para.text.strip():
                parts.append(para.text.strip())

        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(
                    cell.text.strip()
                    for cell in row.cells
                    if cell.text.strip()
                )
                if row_text:
                    parts.append(row_text)

        return clean_text("\n\n".join(parts))

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
        embeddings = embed_chunks(chunks)

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