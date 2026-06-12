# Maritime

Maritime is an AI-powered maritime documentation platform built to streamline the process of validating shipping documents for port clearance. Users upload documents in formats such as PDF, DOCX, or images, which are processed through OCR to extract raw text. A locally hosted LLM then classifies and structures the extracted data into recognized document types — including Bills of Lading, Commercial Invoices, and Certificates of Origin. The structured data is matched against a Neo4j knowledge graph of port-specific requirements to determine whether a vessel's documentation meets clearance criteria. The system combines a Next.js frontend, a FastAPI backend, PostgreSQL for document storage, and Ollama (Mistral) for on-device inference.

## Detailed Overview

### The Problem

Maritime trade involves a complex web of documentation requirements. Every port in the world has its own set of mandatory documents — a shipment cleared at Singapore may be missing a certificate required at Rotterdam. Traditionally, shipping agents and freight forwarders manually cross-check dozens of documents against port authority checklists, a process that is slow, error-prone, and heavily reliant on expert knowledge. A single missing or incorrectly formatted document can delay a vessel, resulting in significant financial and logistical consequences.

### How Maritime Helps

Maritime eliminates the manual effort by automating the entire document ingestion and validation pipeline. Shipping agents, freight forwarders, and port operators can upload a set of documents for a shipment, select the destination port, and instantly receive a clearance report indicating which requirements are met and which are missing. This reduces turnaround time from hours to seconds and minimizes human error in a high-stakes environment.

### Who It Is For

- **Freight forwarders** preparing export/import documentation packages
- **Shipping agents** managing vessel clearance at multiple ports
- **Port operators and customs teams** verifying incoming shipment documentation
- **Logistics companies** handling high volumes of cross-border cargo

### End-to-End Workflow

```
1. Document Upload
   └─ User uploads one or more files (PDF, JPG, PNG, DOCX, ODT, CSV)
      via the web interface

2. OCR Extraction
   └─ Tesseract OCR processes each file and extracts raw text
      Result stored in PostgreSQL (ocr_results table) with a confidence score

3. AI Classification & Structuring
   └─ Ollama (Mistral) reads the raw text and:
       • Identifies the document type (e.g. Bill of Lading, Invoice)
       • Extracts key fields (shipper, consignee, cargo description, dates, etc.)
       • Returns structured JSON
      Result stored in PostgreSQL (structured_data table)

4. Knowledge Graph Linking
   └─ The identified document type is linked as a node in Neo4j
      Each document is connected to its DocumentType node
      Port nodes in Neo4j carry REQUIRES relationships to DocumentType nodes

5. Port Requirement Matching
   └─ User selects a destination port
      The system queries Neo4j for all mandatory and optional documents
      required by that port, then checks which are present in the uploaded set

6. Clearance Package
   └─ A report is generated showing:
       • Documents present and validated
       • Missing mandatory documents
       • Missing optional documents
      The package can be reviewed and corrected before submission
```

### Key Benefits

- **No cloud dependency for AI** — Ollama runs inference locally, keeping sensitive shipping data on-premise
- **Extensible knowledge graph** — new ports and document requirements can be added via Cypher queries in Neo4j without touching application code
- **Structured audit trail** — every upload, OCR result, and AI extraction is persisted in PostgreSQL for traceability
- **Multi-format support** — handles scanned images, PDFs, and office documents in a single pipeline

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python |
| OCR | Tesseract OCR |
| AI / LLM | Ollama (Mistral) |
| Relational DB | PostgreSQL |
| Graph DB | Neo4j |

## Running the App

**Backend**
```bash
cd backend
venv\Scripts\activate        # Windows — use: source venv/bin/activate on macOS/Linux
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3001** in your browser.
