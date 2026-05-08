# MaritimeDocs — AI-Powered Maritime Documentation POC

Upload maritime documents, extract data with OCR + AI, and match them against port requirements stored in a knowledge graph.

---

## What You Need to Install First

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10 + | https://python.org/downloads |
| Node.js | 18 + | https://nodejs.org |
| PostgreSQL | any | https://www.postgresql.org/download |
| Neo4j Desktop | any | https://neo4j.com/download |
| Ollama | any | https://ollama.com/download |
| Tesseract OCR | any | https://github.com/UB-Mannheim/tesseract/wiki *(Windows)* |

---

## One-Time Setup

### 1. Clone / copy the project

```
git clone <your-repo-url>
cd sample
```

---

### 2. PostgreSQL — create the database

Open **pgAdmin** (or psql) and run:

```sql
CREATE USER maritime WITH PASSWORD 'maritime';
CREATE DATABASE maritime_db OWNER maritime;
```

> The app expects PostgreSQL on **port 7000**.
> If your PostgreSQL runs on the default port 5432, either change the port in pgAdmin → Server properties → Connection, or update `backend/.env` to use port 5432.

---

### 3. Neo4j Desktop — create a local instance

1. Open Neo4j Desktop → **New** → **Local DBMS**
2. Name it anything (e.g. `MariTime`)
3. Set password: `Maritime@2026`
4. Click **Start**

Port 7687 is used automatically. No extra config needed — the app seeds all port and document data on first run.

---

### 4. Ollama — pull the AI model

```bash
ollama pull mistral
```

Verify it works:
```bash
ollama run mistral "hello"
```

---

### 5. Tesseract OCR

**Windows:** Download and run the installer from https://github.com/UB-Mannheim/tesseract/wiki  
Install to the default path: `C:\Program Files\Tesseract-OCR\tesseract.exe`

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt install tesseract-ocr
```

---

### 6. Backend — install Python dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

---

### 7. Frontend — install Node dependencies

```bash
cd frontend
npm install
```

---

## Running the App

Open **two terminals** and run one command in each:

**Terminal 1 — Backend**
```bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:3001** in your browser.

---

## Service URLs

| Service | URL |
|---------|-----|
| App (frontend) | http://localhost:3001 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Neo4j Browser | http://localhost:7474 |

---

## Environment Variables

The file `backend/.env` is pre-configured. If your ports or passwords differ, edit it:

```env
DOCUMENTS_DATABASE_URL=postgresql+asyncpg://maritime:maritime@localhost:7000/maritime_db
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=Maritime@2026
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
```

---

## How It Works

```
Upload file
    │
    ▼
Tesseract OCR  ──▶  raw text + confidence score  ──▶  ocr_results table
    │
    ▼
Ollama (Mistral)  ──▶  document type + structured JSON  ──▶  structured_data table
    │
    ▼
Neo4j  ──▶  Document node linked to DocumentType node
    │
    ▼
Port Selection  ──▶  match vault documents against port requirements  ──▶  Clearance Package
```

### Supported file types
`PDF · JPG · PNG · DOCX · ODT · CSV`

### Supported document types
Bill of Lading · Commercial Invoice · Packing List · Certificate of Origin ·  
Phytosanitary Certificate · Health Certificate · Dangerous Goods Declaration · Customs Declaration

---

## Adding Custom Document Requirements (Neo4j)

Open Neo4j Browser at http://localhost:7474 and run Cypher queries:

**Add a custom document type:**
```cypher
MERGE (d:DocumentType {name: 'your_doc_type'})
SET d.display_name = 'Your Doc Type', d.description = 'Description here'
```

**Link it as a requirement for a port:**
```cypher
MATCH (p:Port {code: 'NYK'}), (d:DocumentType {name: 'your_doc_type'})
MERGE (p)-[:REQUIRES {mandatory: true}]->(d)
```

**View all port requirements:**
```cypher
MATCH (p:Port)-[r:REQUIRES]->(d:DocumentType) RETURN p, r, d
```

---




For Running 

BackEnd -  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

FrontEnd - npm run dev