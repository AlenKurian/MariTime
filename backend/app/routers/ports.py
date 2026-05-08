import logging
import re
from difflib import SequenceMatcher
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app.models.database import Session, Document, OcrResult, StructuredData
from app.models.schemas import (
    PortResponse,
    PortRequirementsResponse,
    DocumentRequirement,
    PortMatchResponse,
    MatchedDocument,
    DocumentResponse,
)
from app.services.neo4j_service import neo4j_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _normalize(name: str) -> str:
    """Strip extension, lowercase, keep only a-z0-9 (drop spaces, hyphens, underscores).
    Comparing the plain alphanumeric form means 'AadharCard', 'Aadhar Card',
    'aadhar_card' and 'aadhar card' all collapse to the same token.
    """
    stem = name.rsplit(".", 1)[0] if "." in name else name
    return re.sub(r"[^a-z0-9]", "", stem.lower())


def _names_match(req_norm: str, file_norm: str) -> bool:
    """Exact, substring, or fuzzy (≥0.82 similarity) match after normalisation.
    Fuzzy handles spelling variants like 'aadhaar' vs 'aadhar'.
    """
    if req_norm == file_norm or req_norm in file_norm or file_norm in req_norm:
        return True
    if len(req_norm) >= 4 and len(file_norm) >= 4:
        return SequenceMatcher(None, req_norm, file_norm).ratio() >= 0.82
    return False


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_structured(doc_ids: List[int]) -> dict:
    """Return {document_id: StructuredData} — used to match doc types."""
    if not doc_ids:
        return {}
    async with Session() as session:
        result = await session.execute(
            select(StructuredData).where(StructuredData.document_id.in_(doc_ids))
        )
        return {s.document_id: s for s in result.scalars().all()}


async def _fetch_ocr(doc_ids: List[int]) -> dict:
    """Return {document_id: OcrResult}."""
    if not doc_ids:
        return {}
    async with Session() as session:
        result = await session.execute(
            select(OcrResult).where(OcrResult.document_id.in_(doc_ids))
        )
        return {r.document_id: r for r in result.scalars().all()}


def _build_response(
    doc: Document,
    ocr: Optional[OcrResult],
    struct: Optional[StructuredData],
) -> DocumentResponse:
    extracted = None
    if ocr or struct:
        extracted = {
            "id":               struct.id if struct else ocr.id,
            "document_id":      doc.id,
            "raw_text":         ocr.raw_text if ocr else None,
            "confidence_score": ocr.confidence_score if ocr else None,
            "structured_data":  struct.structured_fields if struct else None,
            "document_type":    struct.document_type if struct else None,
            "created_at":       ocr.created_at if ocr else struct.created_at,
            "updated_at":       struct.updated_at if struct else ocr.created_at,
        }
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
        "extracted_data":    extracted,
    })


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PortResponse])
async def list_ports():
    try:
        ports = neo4j_service.get_all_ports()
        return [PortResponse(**p) for p in ports]
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Knowledge graph unavailable: {e}")


@router.get("/{port_code}/requirements", response_model=PortRequirementsResponse)
async def get_port_requirements(port_code: str):
    try:
        reqs = neo4j_service.get_port_requirements(port_code.upper())
        if not reqs:
            raise HTTPException(status_code=404, detail=f"Port '{port_code}' not found")
        ports = neo4j_service.get_all_ports()
        port_info = next((p for p in ports if p["code"] == port_code.upper()), None)
        port_name = port_info["name"] if port_info else port_code.upper()
        return PortRequirementsResponse(
            port_code=port_code.upper(),
            port_name=port_name,
            requirements=[
                DocumentRequirement(
                    doc_type=r["doc_type"],
                    display_name=r["display_name"],
                    description=r["description"],
                    mandatory=r["mandatory"],
                )
                for r in reqs
            ],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Knowledge graph unavailable: {e}")


@router.get("/match", response_model=PortMatchResponse)
async def match_documents(destination: str, request: Request):
    origin = request.query_params.get("origin", "")

    reqs = neo4j_service.get_port_requirements(destination.upper())
    if not reqs:
        raise HTTPException(status_code=404, detail=f"Port '{destination}' not found")

    # Load everything in ONE session — extract to plain dicts immediately so
    # no SQLAlchemy attribute access happens after the session closes.
    vault: list = []   # [{id, filename, file_norm, ollama_type, doc_obj, ocr_obj, struct_obj}]
    try:
        async with Session() as db:
            doc_rows = (await db.execute(
                select(Document)
                .where(Document.status == "completed")
                .order_by(Document.created_at.desc())
            )).scalars().all()

            ids = [d.id for d in doc_rows]

            struct_map: dict = {}
            ocr_map: dict = {}
            if ids:
                struct_map = {
                    s.document_id: s
                    for s in (await db.execute(
                        select(StructuredData).where(StructuredData.document_id.in_(ids))
                    )).scalars().all()
                }
                ocr_map = {
                    r.document_id: r
                    for r in (await db.execute(
                        select(OcrResult).where(OcrResult.document_id.in_(ids))
                    )).scalars().all()
                }

            # Extract to plain Python objects while the session is still open
            for doc in doc_rows:
                struct = struct_map.get(doc.id)
                ocr    = ocr_map.get(doc.id)
                vault.append({
                    "file_norm":   _normalize(doc.original_filename),
                    "ollama_type": struct.document_type if struct else None,
                    "response":    _build_response(doc, ocr, struct),
                })

    except Exception as exc:
        logger.warning("DB unavailable during match: %s", exc)

    # ── Debug: log exactly what we're comparing ────────────────────────────────
    logger.info("--- MATCH for %s ---", destination)
    for r in reqs:
        logger.info("  REQ  doc_type=%r  norm=%r", r["doc_type"], _normalize(r["doc_type"]))
    for v in vault:
        logger.info("  DOC  file_norm=%r  ollama=%r", v["file_norm"], v["ollama_type"])

    # ── Pass 1: filename-first (handles custom types Ollama doesn't know) ──────
    doc_by_filename: dict = {}
    claimed_indices: set = set()

    for req in reqs:
        req_norm = _normalize(req["doc_type"])
        for i, item in enumerate(vault):
            if i in claimed_indices:
                continue
            if _names_match(req_norm, item["file_norm"]):
                logger.info("  FILENAME HIT: req=%r  file_norm=%r", req["doc_type"], item["file_norm"])
                doc_by_filename[req["doc_type"]] = item["response"]
                claimed_indices.add(i)
                break

    # ── Pass 2: Ollama type (standard docs not caught by filename) ─────────────
    doc_by_type: dict = {}
    for i, item in enumerate(vault):
        if i in claimed_indices:
            continue
        t = item["ollama_type"]
        if t and t not in doc_by_type:
            logger.info("  TYPE HIT: ollama=%r  file_norm=%r", t, item["file_norm"])
            doc_by_type[t] = item["response"]

    # ── Build response ─────────────────────────────────────────────────────────
    matched_list: List[MatchedDocument] = []
    for req in reqs:
        doc_type = req["doc_type"]
        doc_resp = doc_by_filename.get(doc_type) or doc_by_type.get(doc_type)
        matched_list.append(MatchedDocument(
            doc_type=doc_type,
            display_name=req["display_name"],
            mandatory=req["mandatory"],
            matched=doc_resp is not None,
            document=doc_resp,
        ))

    mandatory_docs = [m for m in matched_list if m.mandatory]
    return PortMatchResponse(
        origin_port=(origin.upper() if origin else destination.upper()),
        destination_port=destination.upper(),
        required_documents=matched_list,
        matched_count=sum(1 for m in mandatory_docs if m.matched),
        total_required=len(mandatory_docs),
    )


@router.get("/match-debug")
async def match_debug(destination: str):
    """Return raw normalised strings for requirements and uploaded docs — use to diagnose matching."""
    reqs = neo4j_service.get_port_requirements(destination.upper())

    doc_rows = []
    struct_rows = []
    async with Session() as db:
        result = await db.execute(
            select(Document).where(Document.status == "completed").order_by(Document.created_at.desc())
        )
        docs = result.scalars().all()
        ids = [d.id for d in docs]
        struct_map = await _fetch_structured(ids)

    for doc in docs:
        struct = struct_map.get(doc.id)
        doc_rows.append({
            "id": doc.id,
            "original_filename": doc.original_filename,
            "file_norm": _normalize(doc.original_filename),
            "ollama_type": struct.document_type if struct else None,
        })

    for req in reqs:
        struct_rows.append({
            "doc_type": req["doc_type"],
            "req_norm": _normalize(req["doc_type"]),
            "display_name": req["display_name"],
            "mandatory": req["mandatory"],
        })

    return {"requirements": struct_rows, "uploaded_docs": doc_rows}
