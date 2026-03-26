import asyncio
import os
import re
import uuid
import aiofiles
from sqlalchemy import select
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


def extract_text(file_path: str, file_type: str) -> list[tuple[str, int | None]]:
    if file_type == "txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return [(clean_text(f.read()), 1)]

    elif file_type == "pdf":
        import pdfplumber
        pages = []
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    pages.append((clean_text(page_text), i + 1))
        return pages

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

        return [(clean_text("\n\n".join(parts)), 1)]

    else:
        raise ValueError(f"Unsupported file type: {file_type}")


async def process_document(document_id: int):
    async with SessionLocal() as session:
        try:
            document = (
                await session.execute(select(Document).where(Document.id == document_id))
            ).scalar_one_or_none()
            if not document:
                return

            document.status = "processing"
            await session.commit()

            pages = await asyncio.to_thread(extract_text, document.file_path, document.file_type)
            
            chunk_global_index = 0
            for page_text, page_number in pages:
                # Split current page into chunks
                chunks = split_text(page_text)
                if not chunks:
                    continue
                
                embeddings = await embed_chunks(chunks)

                for chunk_text, embedding in zip(chunks, embeddings):
                    session.add(
                        Chunk(
                            document_id=document.id,
                            chunk_index=chunk_global_index,
                            page_number=page_number,
                            chunk_text=chunk_text,
                            embedding=embedding,
                        )
                    )
                    chunk_global_index += 1

            document.status = "indexed"
            await session.commit()

        except Exception:
            await session.rollback()
            try:
                document = (
                    await session.execute(select(Document).where(Document.id == document_id))
                ).scalar_one_or_none()
                if document:
                    document.status = "failed"
                    await session.commit()
            except Exception:
                await session.rollback()
            raise
