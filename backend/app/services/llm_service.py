import json
import logging
import httpx
from typing import Any, Dict, Optional, Tuple
from app.config import settings
from app.models.schemas import DOCUMENT_SCHEMAS

logger = logging.getLogger(__name__)

CLASSIFY_PROMPT = """You are a maritime document classifier. Given the following text extracted from a document, identify the document type.

Choose ONLY from these types:
- bill_of_lading
- commercial_invoice
- packing_list
- certificate_of_origin
- phytosanitary_certificate
- health_certificate
- dangerous_goods_declaration
- customs_declaration
- generic
- aadhar_card
- ticket

Respond with ONLY the document type string, nothing else.

Document text:
{text}
"""

EXTRACT_PROMPT = """You are a maritime document data extractor. Extract structured information from the following document text.

Document type: {doc_type}
Required fields: {fields}

Rules:
1. Extract only information explicitly present in the text
2. Use empty string "" for missing fields
3. Return ONLY valid JSON matching the schema exactly
4. Do not add extra fields
5. All values must be strings

Document text:
{text}

Return JSON:
"""


async def classify_document(raw_text: str) -> str:
    if not raw_text or len(raw_text.strip()) < 20:
        return "generic"
    prompt = CLASSIFY_PROMPT.format(text=raw_text[:3000])
    response = await _call_ollama(prompt, max_tokens=20)
    result = response.strip().lower().replace('"', "").replace("'", "")
    if result in DOCUMENT_SCHEMAS:
        return result
    for key in DOCUMENT_SCHEMAS:
        if key in result:
            return key
    return "generic"


async def extract_structured_data(raw_text: str, doc_type: str) -> Dict[str, Any]:
    schema = DOCUMENT_SCHEMAS.get(doc_type, DOCUMENT_SCHEMAS["generic"])
    fields_str = json.dumps(schema, indent=2)
    prompt = EXTRACT_PROMPT.format(
        doc_type=doc_type.replace("_", " ").title(),
        fields=fields_str,
        text=raw_text[:4000],
    )
    response = await _call_ollama(prompt, max_tokens=1024)
    return _parse_json_response(response, schema)


async def _call_ollama(prompt: str, max_tokens: int = 512) -> str:
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": max_tokens, "temperature": 0.1},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")
    except httpx.ConnectError:
        logger.warning("Ollama not reachable — LLM extraction skipped")
        return ""
    except httpx.ReadTimeout:
        logger.warning("Ollama timed out — LLM extraction skipped (document may be too long)")
        return ""
    except Exception as e:
        logger.error(f"Ollama call failed: {e}")
        return ""


def _parse_json_response(response: str, fallback_schema: Dict) -> Dict[str, Any]:
    text = response.strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        logger.warning("No JSON found in LLM response, using empty schema")
        return dict(fallback_schema)
    try:
        return json.loads(text[start:end])
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {e}, using empty schema")
        return dict(fallback_schema)
