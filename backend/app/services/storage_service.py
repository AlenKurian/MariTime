import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile
from app.config import settings

ALLOWED_EXTENSIONS = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/jpg": "jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.oasis.opendocument.text": "odt",
    "text/csv": "csv",
    "application/csv": "csv",
}

EXTENSION_MAP = {
    ".pdf": "pdf",
    ".jpg": "jpg",
    ".jpeg": "jpg",
    ".png": "png",
    ".docx": "docx",
    ".odt": "odt",
    ".csv": "csv",
}


def get_upload_dir() -> Path:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def detect_file_type(filename: str, content_type: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in EXTENSION_MAP:
        return EXTENSION_MAP[ext]
    if content_type in ALLOWED_EXTENSIONS:
        return ALLOWED_EXTENSIONS[content_type]
    return "unknown"


async def save_upload_file(file: UploadFile) -> tuple[str, str, int]:
    upload_dir = get_upload_dir()
    file_ext = Path(file.filename or "file").suffix.lower()
    unique_name = f"{uuid.uuid4()}{file_ext}"
    file_path = upload_dir / unique_name

    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return str(file_path), unique_name, len(content)


def delete_file(file_path: str) -> bool:
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            return True
        return False
    except Exception:
        return False
