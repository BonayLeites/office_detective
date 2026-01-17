"""Search and ingestion endpoints for RAG pipeline."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from src.dependencies import DbSession
from src.schemas.search import (
    CaseIngestionResponse,
    DocumentIngestionResponse,
    IngestionRequest,
    SearchRequest,
    SearchResponse,
    SearchResultItem,
)
from src.services.ingestion_service import IngestionService
from src.services.search_service import SearchService

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search_documents(
    case_id: UUID,
    request: SearchRequest,
    db: DbSession,
) -> SearchResponse:
    """Perform semantic search over case documents.

    Args:
        case_id: Case ID to search within
        request: Search parameters (query, k, doc_types, min_score)
        db: Database session

    Returns:
        SearchResponse with matching chunks sorted by similarity
    """
    service = SearchService(db)

    results = await service.search(
        case_id=case_id,
        query=request.query,
        k=request.k,
        doc_types=request.doc_types,
        min_score=request.min_score,
        language=request.language,
    )

    return SearchResponse(
        results=[
            SearchResultItem(
                chunk_id=r.chunk_id,
                doc_id=r.doc_id,
                text=r.text,
                score=r.score,
                chunk_index=r.chunk_index,
                doc_type=r.doc_type,
                subject=r.subject,
                ts=r.ts,
                meta_json=r.meta_json,
            )
            for r in results
        ],
        query=request.query,
        total=len(results),
    )


@router.post(
    "/ingest",
    response_model=CaseIngestionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_case(
    case_id: UUID,
    db: DbSession,
    request: IngestionRequest | None = None,
) -> CaseIngestionResponse:
    """Ingest all documents in a case for RAG.

    Chunks all documents, generates embeddings, and stores in database.

    Args:
        case_id: Case ID to ingest
        db: Database session
        request: Optional ingestion parameters

    Returns:
        CaseIngestionResponse with processing counts
    """
    generate_embeddings = request.generate_embeddings if request else True

    service = IngestionService(db)
    result = await service.ingest_case(
        case_id=case_id,
        generate_embeddings=generate_embeddings,
    )

    return CaseIngestionResponse(
        case_id=result.case_id,
        documents_processed=result.documents_processed,
        total_chunks=result.total_chunks,
        total_embeddings=result.total_embeddings,
    )


@router.post(
    "/ingest/{doc_id}",
    response_model=DocumentIngestionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_document(
    case_id: UUID,  # noqa: ARG001
    doc_id: UUID,
    db: DbSession,
    request: IngestionRequest | None = None,
) -> DocumentIngestionResponse:
    """Ingest a single document for RAG.

    Args:
        case_id: Case ID (for URL consistency, required by path)
        doc_id: Document ID to ingest
        db: Database session
        request: Optional ingestion parameters

    Returns:
        DocumentIngestionResponse with processing counts
    """
    generate_embeddings = request.generate_embeddings if request else True

    service = IngestionService(db)

    try:
        result = await service.ingest_document(
            doc_id=doc_id,
            generate_embeddings=generate_embeddings,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e

    return DocumentIngestionResponse(
        doc_id=result.doc_id,
        chunks_created=result.chunks_created,
        embeddings_generated=result.embeddings_generated,
    )
