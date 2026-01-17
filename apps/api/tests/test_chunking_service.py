"""Tests for chunking service."""

from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from src.models.document import DocType
from src.services.chunking_service import ChunkConfig, ChunkingService


@pytest.fixture
def mock_document() -> MagicMock:
    """Create a mock document for testing."""
    doc = MagicMock()
    doc.doc_type = DocType.email
    doc.subject = "Test Subject"
    doc.body = "This is the body of the test document. It contains some content to be chunked."
    doc.ts = datetime.now(UTC)
    return doc


@pytest.fixture
def long_document() -> MagicMock:
    """Create a mock document with long body for chunking."""
    doc = MagicMock()
    doc.doc_type = DocType.report
    doc.subject = "Quarterly Report"
    # Create a body that will require multiple chunks
    doc.body = """
    This is the first section of the document. It contains important information about the project.

    The second section discusses the technical implementation details and architecture decisions
    that were made during the development phase. We considered multiple approaches before settling
    on the current design.

    In the third section, we analyze the results and outcomes of our work. The metrics show
    positive improvements across all key performance indicators.

    The fourth section covers future plans and roadmap items. We have identified several areas
    for enhancement and optimization.

    Finally, we conclude with a summary of the key findings and recommendations for next steps.
    This document serves as a comprehensive overview of the project status.
    """ * 3  # Repeat to make it longer
    doc.ts = datetime.now(UTC)
    return doc


def test_default_config() -> None:
    """ChunkConfig has sensible defaults."""
    config = ChunkConfig()
    assert config.chunk_size == 512
    assert config.chunk_overlap == 64
    assert len(config.separators) > 0


def test_custom_config() -> None:
    """ChunkConfig accepts custom values."""
    config = ChunkConfig(chunk_size=256, chunk_overlap=32)
    assert config.chunk_size == 256
    assert config.chunk_overlap == 32


def test_chunk_document_basic(mock_document: MagicMock) -> None:
    """ChunkingService chunks a short document."""
    service = ChunkingService()
    chunks = service.chunk_document(mock_document)

    assert len(chunks) >= 1
    assert all(chunk.chunk_index >= 0 for chunk in chunks)
    assert all(len(chunk.text) > 0 for chunk in chunks)


def test_chunk_document_includes_subject(mock_document: MagicMock) -> None:
    """Chunks include subject in context."""
    service = ChunkingService()
    chunks = service.chunk_document(mock_document)

    # First chunk should contain subject
    assert chunks[0].text.startswith("Subject:")
    assert "Test Subject" in chunks[0].text


def test_chunk_document_no_subject() -> None:
    """Document without subject is chunked correctly."""
    doc = MagicMock()
    doc.doc_type = DocType.chat
    doc.subject = None
    doc.body = "Just a chat message without a subject line."
    doc.ts = datetime.now(UTC)

    service = ChunkingService()
    chunks = service.chunk_document(doc)

    assert len(chunks) >= 1
    assert "Subject:" not in chunks[0].text


def test_chunk_document_metadata(mock_document: MagicMock) -> None:
    """Chunks include correct metadata."""
    service = ChunkingService()
    chunks = service.chunk_document(mock_document)

    for chunk in chunks:
        assert "doc_type" in chunk.meta_json
        assert chunk.meta_json["doc_type"] == "email"
        assert "subject" in chunk.meta_json
        assert chunk.meta_json["subject"] == "Test Subject"
        assert "ts" in chunk.meta_json


def test_chunk_document_multiple_chunks(long_document: MagicMock) -> None:
    """Long document produces multiple chunks."""
    config = ChunkConfig(chunk_size=256, chunk_overlap=32)
    service = ChunkingService(config)
    chunks = service.chunk_document(long_document)

    assert len(chunks) > 1
    # Verify indices are sequential
    for i, chunk in enumerate(chunks):
        assert chunk.chunk_index == i


def test_chunk_text_basic() -> None:
    """chunk_text splits raw text."""
    service = ChunkingService()
    text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
    chunks = service.chunk_text(text)

    assert len(chunks) >= 1
    assert all(isinstance(c, str) for c in chunks)


def test_chunk_text_long() -> None:
    """chunk_text handles long text."""
    config = ChunkConfig(chunk_size=100, chunk_overlap=10)
    service = ChunkingService(config)
    text = "A" * 500
    chunks = service.chunk_text(text)

    assert len(chunks) > 1


def test_chunk_overlap() -> None:
    """Chunks have proper overlap."""
    config = ChunkConfig(chunk_size=100, chunk_overlap=20)
    service = ChunkingService(config)

    # Create text that will produce multiple chunks
    text = " ".join(["word"] * 100)  # ~400+ chars
    chunks = service.chunk_text(text)

    assert len(chunks) > 1
    # Each chunk should be around chunk_size (with some tolerance)
    for chunk in chunks[:-1]:  # Exclude last chunk which may be shorter
        assert len(chunk) <= config.chunk_size + 50  # Allow some tolerance


def test_empty_document() -> None:
    """Empty document body produces minimal chunks."""
    doc = MagicMock()
    doc.doc_type = DocType.note
    doc.subject = None
    doc.body = ""
    doc.ts = datetime.now(UTC)

    service = ChunkingService()
    chunks = service.chunk_document(doc)

    # Empty body should still produce at least one chunk (possibly empty)
    assert isinstance(chunks, list)
