"""Document management endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from src.dependencies import DbSession
from src.models.document import DocType
from src.schemas.document import (
    ChunkResponse,
    DocumentCreate,
    DocumentListResponse,
    DocumentResponse,
    DocumentWithChunks,
)
from src.services.document_service import DocumentService

router = APIRouter()


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    case_id: UUID,
    db: DbSession,
    skip: int = 0,
    limit: int = 50,
    doc_type: DocType | None = None,
) -> DocumentListResponse:
    """List documents for a case with pagination."""
    service = DocumentService(db)

    documents = await service.list_by_case(case_id, skip, limit, doc_type)
    total = await service.count_by_case(case_id, doc_type)

    # Get chunk counts for each document
    doc_responses = []
    for doc in documents:
        chunk_count = await service.get_chunk_count(doc.doc_id)
        doc_responses.append(
            DocumentResponse(
                doc_id=doc.doc_id,
                case_id=doc.case_id,
                doc_type=doc.doc_type,
                ts=doc.ts,
                author_entity_id=doc.author_entity_id,
                subject=doc.subject,
                body=doc.body,
                metadata_json=doc.metadata_json,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                chunk_count=chunk_count,
            )
        )

    return DocumentListResponse(documents=doc_responses, total=total)


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    case_id: UUID,
    doc_id: UUID,
    db: DbSession,
) -> DocumentResponse:
    """Get a specific document by ID."""
    service = DocumentService(db)
    document = await service.get_by_id(doc_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {doc_id} not found",
        )

    # Verify document belongs to this case
    if document.case_id != case_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {doc_id} not found in case {case_id}",
        )

    chunk_count = await service.get_chunk_count(doc_id)

    return DocumentResponse(
        doc_id=document.doc_id,
        case_id=document.case_id,
        doc_type=document.doc_type,
        ts=document.ts,
        author_entity_id=document.author_entity_id,
        subject=document.subject,
        body=document.body,
        metadata_json=document.metadata_json,
        created_at=document.created_at,
        updated_at=document.updated_at,
        chunk_count=chunk_count,
    )


@router.get("/{doc_id}/full", response_model=DocumentWithChunks)
async def get_document_full(
    case_id: UUID,
    doc_id: UUID,
    db: DbSession,
) -> DocumentWithChunks:
    """Get a document with all its chunks."""
    service = DocumentService(db)
    document = await service.get_with_chunks(doc_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {doc_id} not found",
        )

    # Verify document belongs to this case
    if document.case_id != case_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {doc_id} not found in case {case_id}",
        )

    chunks = [
        ChunkResponse(
            chunk_id=chunk.chunk_id,
            chunk_index=chunk.chunk_index,
            text=chunk.text,
            has_embedding=chunk.embedding is not None,
            meta_json=chunk.meta_json,
        )
        for chunk in sorted(document.chunks, key=lambda c: c.chunk_index)
    ]

    return DocumentWithChunks(
        doc_id=document.doc_id,
        case_id=document.case_id,
        doc_type=document.doc_type,
        ts=document.ts,
        author_entity_id=document.author_entity_id,
        subject=document.subject,
        body=document.body,
        metadata_json=document.metadata_json,
        created_at=document.created_at,
        updated_at=document.updated_at,
        chunk_count=len(chunks),
        chunks=chunks,
    )


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    case_id: UUID,
    data: DocumentCreate,
    db: DbSession,
) -> DocumentResponse:
    """Create a new document."""
    service = DocumentService(db)
    document = await service.create(case_id, data)

    return DocumentResponse(
        doc_id=document.doc_id,
        case_id=document.case_id,
        doc_type=document.doc_type,
        ts=document.ts,
        author_entity_id=document.author_entity_id,
        subject=document.subject,
        body=document.body,
        metadata_json=document.metadata_json,
        created_at=document.created_at,
        updated_at=document.updated_at,
        chunk_count=0,
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    case_id: UUID,
    doc_id: UUID,
    db: DbSession,
) -> None:
    """Delete a document."""
    service = DocumentService(db)
    document = await service.get_by_id(doc_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {doc_id} not found",
        )

    # Verify document belongs to this case
    if document.case_id != case_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {doc_id} not found in case {case_id}",
        )

    await service.delete(document)
