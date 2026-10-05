import asyncio
import json
import logging

from sqlalchemy import select

from config import settings
from models.document import Document
from utils.files import save_upload, get_upload_path
from utils.pdf import extract_pdf_text
from core.ai import extract_entities, extract_relationships
from services.graph import GraphService
from database.postgres import SessionLocal


logger = logging.getLogger("document_service")


class DocumentService:

    @staticmethod
    async def list(db, user_id):
        result = await db.execute(
            select(Document)
            .where(Document.uploaded_by == user_id)
            .order_by(Document.created_at.desc())
        )

        return list(result.scalars().all())

    @staticmethod
    async def get(db, document_id):
        result = await db.execute(
            select(Document).where(Document.id == document_id)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def ingest(
        db,
        user_id,
        filename,
        content,
        content_type,
    ):
        if len(content) > settings.MAX_UPLOAD_MB * 1024 * 1024:
            raise ValueError("File exceeds upload limit.")

        object_name = save_upload(
            filename,
            content,
        )

        document = Document(
            filename=filename,
            object_name=object_name,
            content_type=content_type,
            size_bytes=len(content),
            uploaded_by=user_id,
        )

        db.add(document)

        await db.commit()
        await db.refresh(document)

        logger.info(
            "Document uploaded: id=%s filename=%s path=%s",
            document.id,
            document.filename,
            document.object_name,
        )

        return document

    @staticmethod
    async def process(document_id):

        async with SessionLocal() as db:

            document = await DocumentService.get(
                db,
                document_id,
            )

            if not document:
                logger.error(
                    "Document not found: id=%s",
                    document_id,
                )
                return

            try:

                # ==================================================
                # STEP 1 — PDF TEXT EXTRACTION
                # ==================================================

                document.status = "EXTRACTING"
                document.error_message = None

                await db.commit()

                logger.info(
                    "DOCUMENT STATUS: id=%s status=EXTRACTING",
                    document.id,
                )

                file_path = get_upload_path(
                    document.object_name
                )

                logger.info(
                    "Processing document id=%s path=%s",
                    document.id,
                    file_path,
                )

                if not file_path.exists():
                    raise FileNotFoundError(
                        f"Document file does not exist: {file_path}"
                    )

                text = await asyncio.to_thread(
                    extract_pdf_text,
                    file_path,
                )

                if not text or not text.strip():
                    raise ValueError(
                        "No readable text was extracted from the PDF."
                    )

                logger.info(
                    "PDF text extracted: document=%s characters=%s",
                    document.id,
                    len(text),
                )

                # ==================================================
                # STEP 2 — AI ANALYSIS
                # ==================================================

                document.status = "AI_ANALYSIS"

                await db.commit()

                logger.info(
                    "DOCUMENT STATUS: id=%s status=AI_ANALYSIS",
                    document.id,
                )

                # --------------------------------------------------
                # Entity extraction
                # --------------------------------------------------

                logger.info(
                    "Starting entity extraction: document=%s",
                    document.id,
                )

                entities = await extract_entities(text)

                logger.info(
                    "EXTRACTED ENTITIES: %s",
                    json.dumps(
                        entities,
                        ensure_ascii=False,
                        indent=2,
                    ),
                )

                logger.info(
                    "Entities extracted: document=%s count=%s",
                    document.id,
                    len(entities),
                )

                # --------------------------------------------------
                # Relationship extraction
                # --------------------------------------------------

                logger.info(
                    "Starting relationship extraction: document=%s",
                    document.id,
                )

                relationships = await extract_relationships(
                    text,
                    entities,
                )

                logger.info(
                    "EXTRACTED RELATIONSHIPS: %s",
                    json.dumps(
                        relationships,
                        ensure_ascii=False,
                        indent=2,
                    ),
                )

                logger.info(
                    "Relationships extracted: document=%s count=%s",
                    document.id,
                    len(relationships),
                )

                # ==================================================
                # STEP 3 — GRAPH + GEOINT
                # ==================================================

                document.status = "GRAPH_UPDATE"

                await db.commit()

                logger.info(
                    "DOCUMENT STATUS: id=%s status=GRAPH_UPDATE",
                    document.id,
                )

                logger.info(
                    "Updating Neo4j graph: document=%s",
                    document.id,
                )

                graph_result = await GraphService.upsert(
                    document.id,
                    entities,
                    relationships,
                )

                logger.info(
                    "Neo4j update complete: document=%s result=%s",
                    document.id,
                    graph_result,
                )

                # ==================================================
                # STEP 4 — COMPLETE
                # ==================================================

                document.status = "PROCESSED"
                document.error_message = None

                await db.commit()

                logger.info(
                    "DOCUMENT STATUS: id=%s status=PROCESSED",
                    document.id,
                )

                logger.info(
                    "DOCUMENT PROCESSING COMPLETE: document=%s",
                    document.id,
                )

            except Exception as ex:

                logger.exception(
                    "DOCUMENT PROCESSING FAILED: document=%s",
                    document.id,
                )

                document.status = "FAILED"
                document.error_message = str(ex)[:2000]

                await db.commit()

                logger.info(
                    "DOCUMENT STATUS: id=%s status=FAILED",
                    document.id,
                )

    @staticmethod
    async def extract_text(document):
        return await asyncio.to_thread(
            extract_pdf_text,
            get_upload_path(document.object_name),
        )

    @staticmethod
    async def delete(db, document_id, user_id):

        document = await DocumentService.get(
            db,
            document_id,
        )

        if not document:
            raise ValueError(
                "Document not found."
            )

        if document.uploaded_by != user_id:
            raise PermissionError(
                "You do not have permission to delete this document."
            )

        object_name = document.object_name
        filename = document.filename

        # ----------------------------------------------------------
        # Remove Neo4j graph data
        # ----------------------------------------------------------

        await GraphService.delete_document(
            document_id
        )

        # ----------------------------------------------------------
        # Remove PostgreSQL document
        # ----------------------------------------------------------

        await db.delete(document)
        await db.commit()

        # ----------------------------------------------------------
        # Remove physical PDF
        # ----------------------------------------------------------

        file_path = get_upload_path(
            object_name
        )

        try:

            if file_path.exists():
                file_path.unlink()

        except Exception as exc:

            logger.warning(
                "Could not delete physical PDF: %s",
                exc,
            )

        logger.info(
            "Document deleted: id=%s filename=%s",
            document_id,
            filename,
        )

        return {
            "message": "Document deleted successfully.",
            "document_id": document_id,
        }