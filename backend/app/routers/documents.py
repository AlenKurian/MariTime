import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.models.database import (
    get_docs_db, Session,
    Document, OcrResult, StructuredData,
)
from app.models.schemas import (
    DocumentResponse, ExtractedDataResponse,
    OcrResultResponse, StructuredDataResponse,
    ExtractedDataUpdate, TaskStatusResponse,
)
from app.services.storage_service import save_upload_file, delete_file, detect_file_type
from app.services.neo4j_service import neo4j_service
from app.workers.tasks import process_document

router = APIRouter()

ALLOWED_TYPES = {"pdf", "jpg", "png", "docx", "odt", "csv"}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_ocr(doc_ids: List[int]) -> dict:
    """Return {document_id: OcrResult}."""
    if not doc_ids:
        return {}
    async with Session() as session:
        result = await session.execute(
            select(OcrResult).where(OcrResult.document_id.in_(doc_ids))
        )
        return {r.document_id: r for r in result.scalars().all()}


async def _fetch_structured(doc_ids: List[int]) -> dict:
    """Return {document_id: StructuredData}."""
    if not doc_ids:
        return {}
    async with Session() as session:
        result = await session.execute(
            select(StructuredData).where(StructuredData.document_id.in_(doc_ids))
        )
        return {r.document_id: r for r in result.scalars().all()}


def _build_extracted(
    doc_id: int,
    ocr: Optional[OcrResult],
    struct: Optional[StructuredData],
) -> Optional[dict]:
    """Combine ocr_results + structured_data into a single extracted_data dict."""
    if not ocr and not struct:
        return None
    return {
        "id":               struct.id if struct else ocr.id,
        "document_id":      doc_id,
        "raw_text":         ocr.raw_text if ocr else None,
        "confidence_score": ocr.confidence_score if ocr else None,
        "structured_data":  struct.structured_fields if struct else None,
        "document_type":    struct.document_type if struct else None,
        "created_at":       ocr.created_at if ocr else struct.created_at,
        "updated_at":       struct.updated_at if struct else ocr.created_at,
    }


def _build_response(
    doc: Document,
    ocr: Optional[OcrResult],
    struct: Optional[StructuredData],
) -> DocumentResponse:
    return DocumentResponse.model_validate({
        "id":                doc.id,
        "filename":          doc.filename,
        "original_filename": doc.original_filename,
        "file_type":         doc.file_type,
        "file_size":         doc.file_size,
        "status":            doc.status,
        "task_id":           doc.task_id,
        "created_at":        doc.created_at,
        "updated_at":        doc.updated_at,
        "extracted_data":    _build_extracted(doc.id, ocr, struct),
    })


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=List[DocumentResponse], status_code=201)
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_docs_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    results = []
    for file in files:
        file_type = detect_file_type(file.filename or "", file.content_type or "")
        if file_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type for '{file.filename}'. Allowed: {', '.join(ALLOWED_TYPES)}",
            )

        file_path, unique_name, file_size = await save_upload_file(file)

        doc = Document(
            filename=unique_name,
            original_filename=file.filename or unique_name,
            file_type=file_type,
            file_path=file_path,
            file_size=file_size,
            status="processing",
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        background_tasks.add_task(process_document, doc.id, file_path, file_type)
        results.append(_build_response(doc, None, None))

    return results


@router.get("", response_model=List[DocumentResponse])
async def list_documents(db: AsyncSession = Depends(get_docs_db)):
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    docs = result.scalars().all()
    ids = [d.id for d in docs]
    ocr_map    = await _fetch_ocr(ids)
    struct_map = await _fetch_structured(ids)
    return [_build_response(d, ocr_map.get(d.id), struct_map.get(d.id)) for d in docs]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: int, db: AsyncSession = Depends(get_docs_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    ocr_map    = await _fetch_ocr([doc_id])
    struct_map = await _fetch_structured([doc_id])
    return _build_response(doc, ocr_map.get(doc_id), struct_map.get(doc_id))


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_docs_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    delete_file(doc.file_path)

    async with Session() as s:
        await s.execute(delete(OcrResult).where(OcrResult.document_id == doc_id))
        await s.execute(delete(StructuredData).where(StructuredData.document_id == doc_id))
        await s.commit()

    await db.execute(delete(Document).where(Document.id == doc_id))
    await db.commit()

    neo4j_service.delete_document_node(doc_id)


@router.get("/{doc_id}/download")
async def download_document(doc_id: int, db: AsyncSession = Depends(get_docs_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        path=doc.file_path,
        filename=doc.original_filename,
        media_type="application/octet-stream",
    )


_PREVIEW_MIME = {
    "jpg":  "image/jpeg",
    "jpeg": "image/jpeg",
    "png":  "image/png",
    "gif":  "image/gif",
    "pdf":  "application/pdf",
    "csv":  "text/plain",
}

@router.get("/{doc_id}/preview")
async def preview_document(doc_id: int, db: AsyncSession = Depends(get_docs_db)):
    """Serve the file inline so the browser can display images and PDFs directly."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    mime = _PREVIEW_MIME.get(doc.file_type.lower(), "application/octet-stream")
    return FileResponse(
        path=doc.file_path,
        media_type=mime,
        headers={"Content-Disposition": "inline"},
    )


@router.get("/{doc_id}/extracted-data", response_model=ExtractedDataResponse)
async def get_extracted_data(doc_id: int):
    ocr_map    = await _fetch_ocr([doc_id])
    struct_map = await _fetch_structured([doc_id])
    ocr    = ocr_map.get(doc_id)
    struct = struct_map.get(doc_id)
    combined = _build_extracted(doc_id, ocr, struct)
    if not combined:
        raise HTTPException(
            status_code=404,
            detail="Extracted data not found — document may still be processing",
        )
    return ExtractedDataResponse.model_validate(combined)


@router.put("/{doc_id}/extracted-data", response_model=ExtractedDataResponse)
async def update_extracted_data(doc_id: int, payload: ExtractedDataUpdate):
    async with Session() as session:
        result = await session.execute(
            select(StructuredData).where(StructuredData.document_id == doc_id)
        )
        struct = result.scalar_one_or_none()
        if not struct:
            raise HTTPException(status_code=404, detail="Structured data not found")
        if payload.structured_data is not None:
            struct.structured_fields = payload.structured_data
        if payload.document_type is not None:
            struct.document_type = payload.document_type
        await session.commit()
        await session.refresh(struct)

    ocr_map = await _fetch_ocr([doc_id])
    combined = _build_extracted(doc_id, ocr_map.get(doc_id), struct)
    return ExtractedDataResponse.model_validate(combined)


@router.get("/{doc_id}/status", response_model=TaskStatusResponse)
async def get_task_status(doc_id: int, db: AsyncSession = Depends(get_docs_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return TaskStatusResponse(task_id=doc.task_id or "", status=doc.status)


# ── Per-table read endpoints (for inspection / pgAdmin alternative) ─────────────

@router.get("/{doc_id}/ocr", response_model=OcrResultResponse)
async def get_ocr_result(doc_id: int):
    async with Session() as session:
        result = await session.execute(
            select(OcrResult).where(OcrResult.document_id == doc_id)
        )
        ocr = result.scalar_one_or_none()
    if not ocr:
        raise HTTPException(status_code=404, detail="OCR result not found")
    return OcrResultResponse.model_validate(ocr)


@router.get("/{doc_id}/structured", response_model=StructuredDataResponse)
async def get_structured_data(doc_id: int):
    async with Session() as session:
        result = await session.execute(
            select(StructuredData).where(StructuredData.document_id == doc_id)
        )
        struct = result.scalar_one_or_none()
    if not struct:
        raise HTTPException(status_code=404, detail="Structured data not found")
    return StructuredDataResponse.model_validate(struct)


# ── Reprocess & diagnostics ────────────────────────────────────────────────────

@router.post("/{doc_id}/reprocess", status_code=202)
async def reprocess_document(doc_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_docs_db)):
    """Re-run the OCR → LLM → DB pipeline for an existing document (useful after schema changes)."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk — cannot reprocess")
    background_tasks.add_task(process_document, doc.id, doc.file_path, doc.file_type)
    return {"message": f"Reprocessing started for document {doc_id}", "doc_id": doc_id}


@router.get("/debug/stats")
async def db_stats():
    """Return row counts for every table — useful to confirm data is being saved."""
    async with Session() as session:
        doc_count    = (await session.execute(select(func.count()).select_from(Document))).scalar()
        ocr_count    = (await session.execute(select(func.count()).select_from(OcrResult))).scalar()
        struct_count = (await session.execute(select(func.count()).select_from(StructuredData))).scalar()

        by_status = (await session.execute(
            select(Document.status, func.count()).group_by(Document.status)
        )).all()

    return {
        "documents":      doc_count,
        "ocr_results":    ocr_count,
        "structured_data": struct_count,
        "documents_by_status": {row[0]: row[1] for row in by_status},
    }
