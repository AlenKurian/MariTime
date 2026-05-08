from pydantic import BaseModel, Field
from typing import Optional, Any, List, Dict
from datetime import datetime


class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_type: str
    file_size: Optional[int]
    status: str
    task_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    extracted_data: Optional["ExtractedDataResponse"] = None

    model_config = {"from_attributes": True}


class ExtractedDataResponse(BaseModel):
    """Combined view of ocr_results + structured_data (frontend-facing, unchanged)."""
    id: int
    document_id: int
    raw_text: Optional[str]
    confidence_score: Optional[float]
    structured_data: Optional[Any]
    document_type: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OcrResultResponse(BaseModel):
    """Direct representation of the ocr_results table."""
    id: int
    document_id: int
    raw_text: Optional[str]
    confidence_score: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


class StructuredDataResponse(BaseModel):
    """Direct representation of the structured_data table."""
    id: int
    document_id: int
    document_type: Optional[str]
    structured_fields: Optional[Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExtractedDataUpdate(BaseModel):
    structured_data: Optional[Any] = None
    document_type: Optional[str] = None


class PortResponse(BaseModel):
    code: str
    name: str
    country: str
    region: str


class DocumentRequirement(BaseModel):
    doc_type: str
    display_name: str
    description: str
    mandatory: bool


class PortRequirementsResponse(BaseModel):
    port_code: str
    port_name: str
    requirements: List[DocumentRequirement]


class MatchedDocument(BaseModel):
    doc_type: str
    display_name: str
    mandatory: bool
    matched: bool
    document: Optional[DocumentResponse] = None


class PortMatchResponse(BaseModel):
    origin_port: str
    destination_port: str
    required_documents: List[MatchedDocument]
    matched_count: int
    total_required: int


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Any] = None


# ── Clearance package ──────────────────────────────────────────────────────────

class ClearanceDocumentIn(BaseModel):
    document_id: Optional[int] = None
    doc_type: str
    display_name: str
    mandatory: bool
    matched: bool
    original_filename: Optional[str] = None


class ClearancePackageCreate(BaseModel):
    origin_port: str
    destination_port: str
    total_required: int
    matched_count: int
    documents: List[ClearanceDocumentIn]


class ClearanceDocumentResponse(BaseModel):
    id: int
    package_id: int
    document_id: Optional[int]
    doc_type: str
    display_name: str
    mandatory: bool
    matched: bool
    original_filename: Optional[str]

    model_config = {"from_attributes": True}


class ClearancePackageResponse(BaseModel):
    id: int
    origin_port: str
    destination_port: str
    status: str
    total_required: int
    matched_count: int
    created_at: datetime
    documents: List[ClearanceDocumentResponse] = []

    model_config = {"from_attributes": True}


DocumentResponse.model_rebuild()


DOCUMENT_SCHEMAS: Dict[str, Dict] = {
    "bill_of_lading": {
        "bl_number": "",
        "shipper": "",
        "consignee": "",
        "notify_party": "",
        "vessel_name": "",
        "voyage_number": "",
        "port_of_loading": "",
        "port_of_discharge": "",
        "place_of_delivery": "",
        "description_of_goods": "",
        "number_of_packages": "",
        "gross_weight_kg": "",
        "measurement_cbm": "",
        "freight_terms": "",
        "date_of_issue": "",
        "place_of_issue": "",
    },
    "commercial_invoice": {
        "invoice_number": "",
        "invoice_date": "",
        "seller_name": "",
        "seller_address": "",
        "buyer_name": "",
        "buyer_address": "",
        "goods_description": "",
        "hs_code": "",
        "quantity": "",
        "unit": "",
        "unit_price": "",
        "total_amount": "",
        "currency": "",
        "payment_terms": "",
        "incoterms": "",
        "country_of_origin": "",
    },
    "packing_list": {
        "packing_list_number": "",
        "date": "",
        "shipper": "",
        "consignee": "",
        "marks_and_numbers": "",
        "number_of_packages": "",
        "package_type": "",
        "description_of_goods": "",
        "net_weight_kg": "",
        "gross_weight_kg": "",
        "dimensions_cm": "",
        "total_volume_cbm": "",
    },
    "certificate_of_origin": {
        "certificate_number": "",
        "exporter": "",
        "producer": "",
        "importer": "",
        "country_of_origin": "",
        "goods_description": "",
        "hs_code": "",
        "quantity_and_weight": "",
        "certifying_authority": "",
        "authorized_signature": "",
        "issue_date": "",
        "expiry_date": "",
    },
    "phytosanitary_certificate": {
        "certificate_number": "",
        "name_and_address_of_exporter": "",
        "declared_name_and_address_of_consignee": "",
        "place_of_origin": "",
        "declared_means_of_conveyance": "",
        "declared_point_of_entry": "",
        "distinguishing_marks": "",
        "number_and_description_of_packages": "",
        "name_of_produce": "",
        "botanical_name": "",
        "quantity_declared": "",
        "treatment": "",
        "date_of_issue": "",
        "issuing_officer": "",
    },
    "health_certificate": {
        "certificate_number": "",
        "issuing_authority": "",
        "exporter": "",
        "consignee": "",
        "product_description": "",
        "quantity": "",
        "country_of_origin": "",
        "country_of_destination": "",
        "health_declaration": "",
        "veterinary_inspector": "",
        "date_of_inspection": "",
        "date_of_issue": "",
        "validity_period": "",
    },
    "dangerous_goods_declaration": {
        "shipper": "",
        "consignee": "",
        "transport_document_number": "",
        "vessel_flight_number": "",
        "port_place_of_loading": "",
        "port_place_of_discharge": "",
        "un_number": "",
        "proper_shipping_name": "",
        "hazard_class": "",
        "packing_group": "",
        "quantity_and_type_of_packing": "",
        "net_quantity": "",
        "emergency_contact": "",
        "date": "",
    },
    "customs_declaration": {
        "declaration_number": "",
        "date_of_declaration": "",
        "declarant": "",
        "importer_exporter": "",
        "consignee": "",
        "country_of_origin": "",
        "country_of_destination": "",
        "customs_office": "",
        "description_of_goods": "",
        "hs_tariff_code": "",
        "quantity": "",
        "gross_weight_kg": "",
        "customs_value": "",
        "currency": "",
        "duty_amount": "",
        "tax_amount": "",
    },
    "generic": {
        "document_title": "",
        "issuing_party": "",
        "recipient": "",
        "date": "",
        "reference_number": "",
        "description": "",
        "additional_fields": {},
    },
}
