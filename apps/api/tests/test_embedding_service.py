"""Tests for embedding service."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.embedding_service import EmbeddingService, get_embedding_service


@pytest.mark.asyncio
async def test_embed_texts_empty_list() -> None:
    """Embed texts with empty list returns empty list."""
    with patch("src.services.embedding_service.OpenAIEmbeddings"):
        service = EmbeddingService()
        result = await service.embed_texts([])
        assert result == []


@pytest.mark.asyncio
async def test_embed_texts_with_texts() -> None:
    """Embed texts returns embeddings for each text."""
    with patch("src.services.embedding_service.OpenAIEmbeddings") as mock_class:
        mock_embedder = MagicMock()
        mock_embedder.aembed_documents = AsyncMock(
            return_value=[[0.1] * 1536, [0.2] * 1536]
        )
        mock_class.return_value = mock_embedder

        service = EmbeddingService()
        result = await service.embed_texts(["text1", "text2"])

        assert len(result) == 2
        mock_embedder.aembed_documents.assert_called_once_with(["text1", "text2"])


@pytest.mark.asyncio
async def test_embed_query() -> None:
    """Embed query returns single embedding vector."""
    with patch("src.services.embedding_service.OpenAIEmbeddings") as mock_class:
        mock_embedder = MagicMock()
        mock_embedder.aembed_query = AsyncMock(return_value=[0.1] * 1536)
        mock_class.return_value = mock_embedder

        service = EmbeddingService()
        result = await service.embed_query("test query")

        assert len(result) == 1536
        mock_embedder.aembed_query.assert_called_once_with("test query")


def test_get_embedding_service() -> None:
    """Factory function creates embedding service instance."""
    with patch("src.services.embedding_service.OpenAIEmbeddings"):
        service = get_embedding_service()
        assert isinstance(service, EmbeddingService)


def test_embedding_service_dimension() -> None:
    """Embedding service has correct dimension from settings."""
    with patch("src.services.embedding_service.OpenAIEmbeddings"):
        service = EmbeddingService()
        assert service.dimension == 1536  # Default from settings
