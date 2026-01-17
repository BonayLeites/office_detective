"""Chunking service for document processing."""

from dataclasses import dataclass, field

from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.models.document import Document


@dataclass
class ChunkConfig:
    """Configuration for document chunking."""

    chunk_size: int = 512
    chunk_overlap: int = 64
    separators: list[str] = field(default_factory=lambda: ["\n\n", "\n", ". ", ", ", " ", ""])


@dataclass
class ChunkResult:
    """Result of chunking a document."""

    chunk_index: int
    text: str
    meta_json: dict[str, str | int | None]


class ChunkingService:
    """Service for chunking documents into smaller pieces for RAG."""

    def __init__(self, config: ChunkConfig | None = None) -> None:
        """Initialize chunking service with configuration."""
        self.config = config or ChunkConfig()
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config.chunk_size,
            chunk_overlap=self.config.chunk_overlap,
            separators=self.config.separators,
            length_function=len,
        )

    def chunk_document(self, doc: Document) -> list[ChunkResult]:
        """Split a document into chunks with metadata.

        Args:
            doc: The document to chunk

        Returns:
            List of ChunkResult objects with text and metadata
        """
        # Prepare text with context
        text = self._prepare_text(doc)

        # Split into chunks
        chunks = self.splitter.split_text(text)

        # Create chunk results with metadata
        return [
            ChunkResult(
                chunk_index=i,
                text=chunk,
                meta_json={
                    "doc_type": doc.doc_type.value,
                    "subject": doc.subject,
                    "ts": doc.ts.isoformat() if doc.ts else None,
                },
            )
            for i, chunk in enumerate(chunks)
        ]

    def _prepare_text(self, doc: Document) -> str:
        """Prepare document text for chunking by adding context.

        Args:
            doc: The document to prepare

        Returns:
            Prepared text with subject/header info
        """
        parts = []

        # Add subject as header if present
        if doc.subject:
            parts.append(f"Subject: {doc.subject}")

        # Add body
        parts.append(doc.body)

        return "\n\n".join(parts)

    def chunk_text(self, text: str) -> list[str]:
        """Split raw text into chunks.

        Args:
            text: Raw text to chunk

        Returns:
            List of text chunks
        """
        return self.splitter.split_text(text)
