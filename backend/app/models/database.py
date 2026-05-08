from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped
from sqlalchemy import String, Integer, Float, Text, DateTime, Boolean, JSON, func
from datetime import datetime
from typing import Optional, Any
from app.config import settings


# ── Single engine — all tables live in maritime_db ────────────────────────────

engine = create_async_engine(settings.documents_database_url, echo=False)
Session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# ── Table 1: documents ────────────────────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int]              = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str]        = mapped_column(String(512), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str]       = mapped_column(String(50), nullable=False)
    file_path: Mapped[str]       = mapped_column(String(1024), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str]          = mapped_column(String(50), default="pending")
    task_id: Mapped[Optional[str]] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# ── Table 2: ocr_results ──────────────────────────────────────────────────────

class OcrResult(Base):
    __tablename__ = "ocr_results"

    id: Mapped[int]              = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int]     = mapped_column(Integer, nullable=False, index=True)
    raw_text: Mapped[Optional[str]] = mapped_column(Text)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Table 3: structured_data ──────────────────────────────────────────────────

class StructuredData(Base):
    __tablename__ = "structured_data"

    id: Mapped[int]              = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int]     = mapped_column(Integer, nullable=False, index=True)
    document_type: Mapped[Optional[str]] = mapped_column(String(100))
    structured_fields: Mapped[Optional[Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# ── Clearance tables ──────────────────────────────────────────────────────────

class ClearancePackage(Base):
    __tablename__ = "clearance_packages"

    id: Mapped[int]              = mapped_column(Integer, primary_key=True, index=True)
    origin_port: Mapped[str]     = mapped_column(String(10), nullable=False)
    destination_port: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str]          = mapped_column(String(20), default="confirmed")
    total_required: Mapped[int]  = mapped_column(Integer, default=0)
    matched_count: Mapped[int]   = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ClearanceDocument(Base):
    __tablename__ = "clearance_documents"

    id: Mapped[int]              = mapped_column(Integer, primary_key=True, index=True)
    package_id: Mapped[int]      = mapped_column(Integer, nullable=False, index=True)
    document_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    doc_type: Mapped[str]        = mapped_column(String(100), nullable=False)
    display_name: Mapped[str]    = mapped_column(String(200), nullable=False)
    mandatory: Mapped[bool]      = mapped_column(Boolean, default=False)
    matched: Mapped[bool]        = mapped_column(Boolean, default=False)
    original_filename: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)


# ── Init ──────────────────────────────────────────────────────────────────────

async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ── Dependency ────────────────────────────────────────────────────────────────

async def get_db():
    async with Session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Legacy aliases so existing imports keep working without change
get_docs_db = get_db
DocsSession = Session
