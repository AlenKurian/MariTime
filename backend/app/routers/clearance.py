from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_docs_db, ClearancePackage, ClearanceDocument
from app.models.schemas import (
    ClearancePackageCreate,
    ClearancePackageResponse,
    ClearanceDocumentResponse,
)

router = APIRouter()


@router.post("", response_model=ClearancePackageResponse, status_code=201)
async def confirm_package(
    payload: ClearancePackageCreate,
    db: AsyncSession = Depends(get_docs_db),
):
    package = ClearancePackage(
        origin_port=payload.origin_port.upper(),
        destination_port=payload.destination_port.upper(),
        total_required=payload.total_required,
        matched_count=payload.matched_count,
        status="confirmed",
    )
    db.add(package)
    await db.flush()

    cd_rows = []
    for doc in payload.documents:
        cd = ClearanceDocument(
            package_id=package.id,
            document_id=doc.document_id,
            doc_type=doc.doc_type,
            display_name=doc.display_name,
            mandatory=doc.mandatory,
            matched=doc.matched,
            original_filename=doc.original_filename,
        )
        db.add(cd)
        cd_rows.append(cd)

    await db.commit()
    await db.refresh(package)

    return ClearancePackageResponse(
        id=package.id,
        origin_port=package.origin_port,
        destination_port=package.destination_port,
        status=package.status,
        total_required=package.total_required,
        matched_count=package.matched_count,
        created_at=package.created_at,
        documents=[ClearanceDocumentResponse.model_validate(d) for d in cd_rows],
    )


@router.get("", response_model=List[ClearancePackageResponse])
async def list_packages(db: AsyncSession = Depends(get_docs_db)):
    result = await db.execute(
        select(ClearancePackage).order_by(ClearancePackage.created_at.desc())
    )
    packages = result.scalars().all()

    pkg_ids = [p.id for p in packages]
    docs_result = await db.execute(
        select(ClearanceDocument).where(ClearanceDocument.package_id.in_(pkg_ids))
    )
    all_docs = docs_result.scalars().all()
    docs_by_pkg: dict[int, list] = {}
    for d in all_docs:
        docs_by_pkg.setdefault(d.package_id, []).append(d)

    return [
        ClearancePackageResponse(
            id=p.id,
            origin_port=p.origin_port,
            destination_port=p.destination_port,
            status=p.status,
            total_required=p.total_required,
            matched_count=p.matched_count,
            created_at=p.created_at,
            documents=[ClearanceDocumentResponse.model_validate(d) for d in docs_by_pkg.get(p.id, [])],
        )
        for p in packages
    ]


@router.get("/{package_id}", response_model=ClearancePackageResponse)
async def get_package(package_id: int, db: AsyncSession = Depends(get_docs_db)):
    result = await db.execute(
        select(ClearancePackage).where(ClearancePackage.id == package_id)
    )
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    docs_result = await db.execute(
        select(ClearanceDocument).where(ClearanceDocument.package_id == package_id)
    )
    docs = docs_result.scalars().all()

    return ClearancePackageResponse(
        id=package.id,
        origin_port=package.origin_port,
        destination_port=package.destination_port,
        status=package.status,
        total_required=package.total_required,
        matched_count=package.matched_count,
        created_at=package.created_at,
        documents=[ClearanceDocumentResponse.model_validate(d) for d in docs],
    )
