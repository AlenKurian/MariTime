# MaritimeDocs — AI-Powered Maritime Documentation POC

A full-stack single-page application for maritime document processing, featuring drag-and-drop upload, AI-powered OCR + LLM extraction, and Neo4j knowledge graph port-document matching.

## Architecture

```
  ┌──────────┐    ┌──────────┐    ┌──────────────┐
  │ Next.js  │───▶│ FastAPI  │───▶│ PostgreSQL 18│
  │  :3000   │    │  :8000   │    │    :7000     │
  └──────────┘    └────┬─────┘    └──────────────┘
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
          ┌──────┐          ┌──────┐
          │Neo4j │          │Ollama│
          │:7687 │          │:11434│
          └──────┘          └──────┘
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 18 (running on port 7000)
- Neo4j Desktop (MariTime instance on port 7687)
- Ollama with `mistral` model pulled

### 1. Start the backend

Double-click `start-backend.bat` or run:

```bat
start-backend.bat
```

### 2. Start the frontend

Double-click `start-frontend.bat` or run:

```bat
start-frontend.bat
```

### 3. Open the app

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API docs** | http://localhost:8000/docs |
| **Neo4j Browser** | http://localhost:7474 |

---

## Features

### Upload Section
- Drag-and-drop or file picker for **PDF, JPG/PNG, DOCX, ODT, CSV**
- Real-time upload progress bars
- Async AI processing triggered automatically on upload

### Vault Section
- Grid and table views of all uploaded documents
- Status badges: Pending → Processing → Completed / Failed
- Download and delete per document
- Auto-polls every 4 s while documents are processing
- Inline preview of extracted structured fields

### Port Selection Section
- 12 major world ports in the Neo4j knowledge graph
- Selects required document types per destination port
- Matches required documents against uploaded & processed files
- Expandable per-document editable data form
- Add / remove / modify individual extracted fields

### AI Pipeline
1. **PaddleOCR** — reads raw text from images/PDFs with per-line confidence scores
2. **Ollama (Mistral 7B)** — classifies document type and extracts structured JSON
3. **PostgreSQL** — stores document metadata and extracted structured data
4. **Neo4j** — knowledge graph of ports ↔ required document types

### Supported Document Types
| Type | Fields Extracted |
|------|-----------------|
| Bill of Lading | BL No., Shipper, Consignee, Vessel, Ports, Goods |
| Commercial Invoice | Invoice No., Seller, Buyer, Amount, Incoterms |
| Packing List | Package count, Weights, Dimensions |
| Certificate of Origin | Country, HS Code, Certifying Authority |
| Phytosanitary Certificate | Plant health declarations |
| Health Certificate | Product health declarations |
| Dangerous Goods Declaration | UN No., Hazard class, Packing group |
| Customs Declaration | HS code, Duty amounts, Customs value |

---

## Environment Variables

Configured in `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://maritime:maritime@localhost:7000/maritime_db
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=Maritime@2026
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

---

## Ports Knowledge Graph (Neo4j)

Pre-seeded ports: **SGP, RTM, SHA, LAX, DXB, HAM, HKG, BOM, NYK, PTP, ANT, SYD**

Each port has a set of mandatory and optional document requirements modelled as:
```
(Port)-[:REQUIRES {mandatory: bool}]->(DocumentType)
```

Browse the graph at `http://localhost:7474`:
```cypher
MATCH (p:Port)-[r:REQUIRES]->(d:DocumentType) RETURN p, r, d LIMIT 100
```





backend -  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
frontend - npm run dev
