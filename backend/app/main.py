from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import logging

from app.models.database import init_db
from app.services.neo4j_service import neo4j_service
from app.routers import documents, ports, clearance

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Maritime Docs API...")
    try:
        await init_db()
        logger.info("PostgreSQL tables created.")
    except Exception as e:
        logger.warning(f"PostgreSQL unavailable — DB endpoints will return 503: {e}")
    try:
        neo4j_service.init_graph()
        logger.info("Neo4j knowledge graph initialized.")
    except Exception as e:
        logger.warning(f"Neo4j unavailable — port endpoints will return 503: {e}")
    upload_dir = os.environ.get("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    yield
    neo4j_service.close()
    logger.info("Maritime Docs API shut down.")


app = FastAPI(
    title="Maritime Documentation API",
    description="AI-powered maritime document processing and port requirement matching",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(ports.router, prefix="/api/ports", tags=["Ports"])
app.include_router(clearance.router, prefix="/api/clearance", tags=["Clearance"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "maritime-docs-api"}
