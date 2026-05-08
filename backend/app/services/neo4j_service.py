"""
Port-document knowledge graph.

Connects to the Neo4j Desktop instance configured via NEO4J_URL / NEO4J_USER /
NEO4J_PASSWORD.  On startup, init_graph() merges Port and DocumentType nodes and
REQUIRES relationships into the database — it never deletes existing data, so
Document nodes created during previous sessions are preserved.

Falls back to the in-memory dictionaries transparently when Neo4j is unreachable.
"""
import logging
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


# ── Static seed data ──────────────────────────────────────────────────────────

PORT_DATA: List[Dict[str, str]] = [
    {"code": "SGP", "name": "Port of Singapore",        "country": "Singapore",   "region": "Asia Pacific"},
    {"code": "RTM", "name": "Port of Rotterdam",        "country": "Netherlands", "region": "Europe"},
    {"code": "SHA", "name": "Port of Shanghai",         "country": "China",       "region": "Asia Pacific"},
    {"code": "LAX", "name": "Port of Los Angeles",      "country": "USA",         "region": "North America"},
    {"code": "DXB", "name": "Port of Dubai (Jebel Ali)","country": "UAE",         "region": "Middle East"},
    {"code": "HAM", "name": "Port of Hamburg",          "country": "Germany",     "region": "Europe"},
    {"code": "HKG", "name": "Port of Hong Kong",        "country": "Hong Kong",   "region": "Asia Pacific"},
    {"code": "BOM", "name": "Port of Mumbai (JNPT)",    "country": "India",       "region": "Asia Pacific"},
    {"code": "NYK", "name": "Port of New York",         "country": "USA",         "region": "North America"},
    {"code": "PTP", "name": "Port Klang",               "country": "Malaysia",    "region": "Asia Pacific"},
    {"code": "ANT", "name": "Port of Antwerp",          "country": "Belgium",     "region": "Europe"},
    {"code": "SYD", "name": "Port of Sydney",           "country": "Australia",   "region": "Oceania"},
]

DOC_TYPE_META: Dict[str, Dict[str, str]] = {
    "bill_of_lading":              {"display_name": "Bill of Lading",              "description": "Primary shipping contract between shipper and carrier"},
    "commercial_invoice":          {"display_name": "Commercial Invoice",           "description": "Financial document between buyer and seller"},
    "packing_list":                {"display_name": "Packing List",                "description": "Itemized list of package contents"},
    "certificate_of_origin":       {"display_name": "Certificate of Origin",       "description": "Certifies the country where goods were manufactured"},
    "phytosanitary_certificate":   {"display_name": "Phytosanitary Certificate",   "description": "Plant health certificate for agricultural goods"},
    "health_certificate":          {"display_name": "Health Certificate",           "description": "Certifies goods meet health and safety standards"},
    "dangerous_goods_declaration": {"display_name": "Dangerous Goods Declaration", "description": "Required for hazardous material shipments"},
    "customs_declaration":         {"display_name": "Customs Declaration",         "description": "Required declaration for customs clearance"},
}

# port_code → {doc_type: mandatory}
PORT_REQUIREMENTS: Dict[str, Dict[str, bool]] = {
    "SGP": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "dangerous_goods_declaration": False, "health_certificate": False, "phytosanitary_certificate": False},
    "RTM": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "phytosanitary_certificate": False,   "health_certificate": False, "dangerous_goods_declaration": False},
    "SHA": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "health_certificate": False,          "phytosanitary_certificate": False,  "dangerous_goods_declaration": False},
    "LAX": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "dangerous_goods_declaration": False, "health_certificate": False, "phytosanitary_certificate": False},
    "DXB": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "health_certificate": True,           "phytosanitary_certificate": False,  "dangerous_goods_declaration": False},
    "HAM": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "dangerous_goods_declaration": False, "health_certificate": False, "phytosanitary_certificate": False},
    "HKG": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "dangerous_goods_declaration": False, "health_certificate": False, "phytosanitary_certificate": False},
    "BOM": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "health_certificate": True,           "phytosanitary_certificate": True,   "dangerous_goods_declaration": False},
    "NYK": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "dangerous_goods_declaration": False, "health_certificate": False, "phytosanitary_certificate": False},
    "PTP": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "health_certificate": False,          "phytosanitary_certificate": False,  "dangerous_goods_declaration": False},
    "ANT": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "phytosanitary_certificate": False,   "health_certificate": False, "dangerous_goods_declaration": False},
    "SYD": {"bill_of_lading": True,  "commercial_invoice": True,  "packing_list": True,  "certificate_of_origin": True,  "customs_declaration": True,  "health_certificate": True,           "phytosanitary_certificate": True,   "dangerous_goods_declaration": False},
}


# ── Service ────────────────────────────────────────────────────────────────────

class Neo4jService:
    def __init__(self) -> None:
        self._driver = None
        self._connected: bool = False

    # ── Connection ─────────────────────────────────────────────────────────────

    def _try_connect(self) -> bool:
        """Open driver and verify connectivity. Returns True on success."""
        try:
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(
                settings.neo4j_url,
                auth=(settings.neo4j_user, settings.neo4j_password),
            )
            driver.verify_connectivity()
            self._driver = driver
            self._connected = True
            logger.info(
                "Neo4j connected: %s (user=%s)",
                settings.neo4j_url,
                settings.neo4j_user,
            )
            return True
        except Exception as exc:
            logger.warning(
                "Neo4j not reachable at %s — using in-memory graph. Reason: %s",
                settings.neo4j_url,
                exc,
            )
            self._driver = None
            self._connected = False
            return False

    @property
    def is_connected(self) -> bool:
        return self._connected and self._driver is not None

    # ── Graph initialisation ────────────────────────────────────────────────────

    def init_graph(self) -> None:
        """
        Seed Port nodes, DocumentType nodes, and REQUIRES relationships.

        Uses MERGE throughout — safe to call on every startup because it never
        deletes existing nodes (Document nodes from previous sessions are kept).
        Skips seeding if Port nodes are already present (idempotent shortcut).
        """
        if not self._try_connect():
            return

        with self._driver.session() as s:
            # Skip full re-seed if ports already exist
            existing = s.run("MATCH (p:Port) RETURN count(p) AS cnt").single()
            already_seeded = existing and existing["cnt"] == len(PORT_DATA)

            if not already_seeded:
                logger.info("Seeding Neo4j graph with ports, document types and requirements…")
                self._seed_ports(s)
                self._seed_doc_types(s)
                self._seed_requirements(s)
                logger.info("Neo4j graph seeded successfully.")
            else:
                # Still update properties in case definitions changed
                self._seed_ports(s)
                self._seed_doc_types(s)
                self._seed_requirements(s)
                logger.info("Neo4j graph already seeded — properties refreshed.")

    def _seed_ports(self, session) -> None:
        for p in PORT_DATA:
            session.run(
                "MERGE (n:Port {code: $code}) SET n += $props",
                code=p["code"],
                props=p,
            )

    def _seed_doc_types(self, session) -> None:
        for name, meta in DOC_TYPE_META.items():
            session.run(
                "MERGE (d:DocumentType {name: $name}) SET d += $props",
                name=name,
                props={**meta, "name": name},
            )

    def _seed_requirements(self, session) -> None:
        for port_code, reqs in PORT_REQUIREMENTS.items():
            # Skip ports that already have requirements — never overwrite user config
            cnt = session.run(
                "MATCH (p:Port {code: $pc})-[:REQUIRES]->() RETURN count(*) AS cnt",
                pc=port_code,
            ).single()["cnt"]
            if cnt > 0:
                logger.info("Port %s already has %d requirements — skipping seed", port_code, cnt)
                continue
            for doc_type, mandatory in reqs.items():
                session.run(
                    """
                    MATCH (p:Port {code: $pc})
                    MATCH (d:DocumentType {name: $dt})
                    MERGE (p)-[r:REQUIRES]->(d)
                    SET r.mandatory = $m
                    """,
                    pc=port_code,
                    dt=doc_type,
                    m=mandatory,
                )

    # ── Port queries ────────────────────────────────────────────────────────────

    def get_all_ports(self) -> List[Dict[str, str]]:
        if self.is_connected:
            try:
                with self._driver.session() as s:
                    rows = s.run("MATCH (p:Port) RETURN p ORDER BY p.name")
                    return [dict(r["p"]) for r in rows]
            except Exception as exc:
                logger.warning("Neo4j get_all_ports failed, using fallback: %s", exc)
        return sorted(PORT_DATA, key=lambda p: p["name"])

    def get_port_requirements(self, port_code: str) -> List[Dict[str, Any]]:
        if self.is_connected:
            try:
                with self._driver.session() as s:
                    rows = s.run(
                        """
                        MATCH (p:Port {code: $pc})-[r:REQUIRES]->(d:DocumentType)
                        RETURN d.name        AS doc_type,
                               d.display_name AS display_name,
                               d.description  AS description,
                               r.mandatory    AS mandatory
                        ORDER BY r.mandatory DESC, d.display_name
                        """,
                        pc=port_code,
                    )
                    result = [dict(r) for r in rows]
                    if result:
                        return result
            except Exception as exc:
                logger.warning(
                    "Neo4j get_port_requirements failed, using fallback: %s", exc
                )

        # In-memory fallback
        reqs = PORT_REQUIREMENTS.get(port_code, {})
        result = []
        for doc_type, mandatory in reqs.items():
            meta = DOC_TYPE_META.get(doc_type, {})
            result.append({
                "doc_type":     doc_type,
                "display_name": meta.get("display_name", doc_type),
                "description":  meta.get("description", ""),
                "mandatory":    mandatory,
            })
        return sorted(result, key=lambda r: (not r["mandatory"], r["display_name"]))

    # ── Document node management ────────────────────────────────────────────────

    def save_document_node(
        self,
        doc_id: int,
        filename: str,
        file_type: str,
        doc_type: str,
        confidence: float,
    ) -> None:
        """Create or update a Document node and link it to its DocumentType."""
        if not self.is_connected:
            return
        try:
            with self._driver.session() as s:
                # Upsert the Document node
                s.run(
                    """
                    MERGE (d:Document {id: $id})
                    SET d.filename     = $filename,
                        d.file_type    = $file_type,
                        d.doc_type     = $doc_type,
                        d.confidence   = $confidence,
                        d.processed_at = datetime()
                    """,
                    id=doc_id,
                    filename=filename,
                    file_type=file_type,
                    doc_type=doc_type,
                    confidence=confidence,
                )

                # Ensure DocumentType node exists (handles "generic" and custom types)
                display_name = DOC_TYPE_META.get(doc_type, {}).get(
                    "display_name",
                    doc_type.replace("_", " ").title(),
                )
                s.run(
                    """
                    MERGE (dt:DocumentType {name: $doc_type})
                    ON CREATE SET dt.display_name = $display_name
                    """,
                    doc_type=doc_type,
                    display_name=display_name,
                )

                # Link Document → DocumentType
                s.run(
                    """
                    MATCH (d:Document {id: $id})
                    MATCH (dt:DocumentType {name: $doc_type})
                    MERGE (d)-[:IS_TYPE]->(dt)
                    """,
                    id=doc_id,
                    doc_type=doc_type,
                )

            logger.info(
                "Neo4j: saved Document node id=%d type=%s confidence=%.2f",
                doc_id, doc_type, confidence,
            )
        except Exception as exc:
            logger.warning("Neo4j: failed to save Document node %d: %s", doc_id, exc)

    def delete_document_node(self, doc_id: int) -> None:
        """Remove a Document node and all its relationships."""
        if not self.is_connected:
            return
        try:
            with self._driver.session() as s:
                s.run("MATCH (d:Document {id: $id}) DETACH DELETE d", id=doc_id)
            logger.info("Neo4j: deleted Document node id=%d", doc_id)
        except Exception as exc:
            logger.warning("Neo4j: failed to delete Document node %d: %s", doc_id, exc)

    def get_documents_by_type(self, doc_type: str) -> List[Dict[str, Any]]:
        """Return all Document nodes linked to a given DocumentType."""
        if not self.is_connected:
            return []
        try:
            with self._driver.session() as s:
                rows = s.run(
                    """
                    MATCH (d:Document)-[:IS_TYPE]->(dt:DocumentType {name: $doc_type})
                    RETURN d.id         AS id,
                           d.filename   AS filename,
                           d.confidence AS confidence
                    ORDER BY d.processed_at DESC
                    """,
                    doc_type=doc_type,
                )
                return [dict(r) for r in rows]
        except Exception as exc:
            logger.warning("Neo4j: get_documents_by_type failed: %s", exc)
            return []

    # ── Lifecycle ───────────────────────────────────────────────────────────────

    def close(self) -> None:
        if self._driver:
            self._driver.close()
            self._driver = None
            self._connected = False
            logger.info("Neo4j driver closed.")


neo4j_service = Neo4jService()
