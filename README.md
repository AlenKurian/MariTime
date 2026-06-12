# MaritimeDocs

MaritimeDocs is an AI-powered maritime documentation platform built to streamline the process of validating shipping documents for port clearance. Users upload documents in formats such as PDF, DOCX, or images, which are processed through OCR to extract raw text. A locally hosted LLM then classifies and structures the extracted data into recognized document types — including Bills of Lading, Commercial Invoices, and Certificates of Origin. The structured data is matched against a Neo4j knowledge graph of port-specific requirements to determine whether a vessel's documentation meets clearance criteria. The system combines a Next.js frontend, a FastAPI backend, PostgreSQL for document storage, and Ollama (Mistral) for on-device inference.

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
