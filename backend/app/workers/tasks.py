"""Document processing pipeline — OCR → classify → extract → persist, run as a FastAPI BackgroundTask."""
import logging
from sqlalchemy import select, update
from app.models.database import Session, Document, OcrResult, StructuredData
from app.services.ocr_service import extract_text
from app.services.llm_service import classify_document, extract_structured_data
from app.services.neo4j_service import neo4j_service

logger = logging.getLogger(__name__)


async def process_document(document_id: int, file_path: str, file_type: str) -> None:
    """OCR → classify → extract → persist to PostgreSQL (3 tables) and Neo4j."""
    logger.info("[doc %d] START processing  file_type=%s  path=%s", document_id, file_type, file_path)
    try:
        await _set_status(document_id, "processing")

        # 1. OCR — raw text + confidence
        logger.info("[doc %d] step 1: OCR extraction", document_id)
        raw_text, confidence = extract_text(file_path, file_type)
        logger.info("[doc %d] step 1 done — text_len=%d  confidence=%.2f", document_id, len(raw_text), confidence)

        # 2. LLM — document classification
        logger.info("[doc %d] step 2: classify via Ollama", document_id)
        doc_type = await classify_document(raw_text)
        logger.info("[doc %d] step 2 done — doc_type=%s", document_id, doc_type)

        # 3. LLM — structured field extraction
        logger.info("[doc %d] step 3: extract structured fields", document_id)
        structured = await extract_structured_data(raw_text, doc_type)
        logger.info("[doc %d] step 3 done — fields=%d", document_id, len(structured))

        # 4. Persist to ocr_results table
        logger.info("[doc %d] step 4: save OCR to DB", document_id)
        await _save_ocr(document_id, raw_text, confidence)
        logger.info("[doc %d] step 4 done — ocr_results row saved", document_id)

        # 5. Persist to structured_data table
        logger.info("[doc %d] step 5: save structured data to DB", document_id)
        await _save_structured(document_id, doc_type, structured)
        logger.info("[doc %d] step 5 done — structured_data row saved", document_id)

        # 6. Mark document completed
        filename = await _set_completed(document_id)

        # 7. Save Document node + IS_TYPE relationship → Neo4j
        neo4j_service.save_document_node(
            doc_id=document_id,
            filename=filename,
            file_type=file_type,
            doc_type=doc_type,
            confidence=confidence,
        )

        logger.info("[doc %d] DONE — type=%s  confidence=%.2f", document_id, doc_type, confidence)
    except Exception as exc:
        logger.error("[doc %d] FAILED: %s", document_id, exc, exc_info=True)
        await _set_status(document_id, "failed")


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _set_status(document_id: int, status: str) -> None:
    async with Session() as session:
        await session.execute(
            update(Document).where(Document.id == document_id).values(status=status)
        )
        await session.commit()


async def _set_completed(document_id: int) -> str:
    async with Session() as session:
        await session.execute(
            update(Document).where(Document.id == document_id).values(status="completed")
        )
        await session.commit()
        result = await session.execute(
            select(Document.original_filename).where(Document.id == document_id)
        )
        return result.scalar_one_or_none() or ""


async def _save_ocr(document_id: int, raw_text: str, confidence: float) -> None:
    """Upsert a row in ocr_results."""
    async with Session() as session:
        result = await session.execute(
            select(OcrResult).where(OcrResult.document_id == document_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.raw_text        = raw_text
            existing.confidence_score = confidence
        else:
            session.add(OcrResult(
                document_id=document_id,
                raw_text=raw_text,
                confidence_score=confidence,
            ))
        await session.commit()


async def _save_structured(document_id: int, doc_type: str, structured: dict) -> None:
    """Upsert a row in structured_data."""
    async with Session() as session:
        result = await session.execute(
            select(StructuredData).where(StructuredData.document_id == document_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.document_type     = doc_type
            existing.structured_fields = structured
        else:
            session.add(StructuredData(
                document_id=document_id,
                document_type=doc_type,
                structured_fields=structured,
            ))
        await session.commit()
