"""Embedding service for generating vector embeddings."""

from langchain_openai import OpenAIEmbeddings
from pydantic import SecretStr

from src.config import settings


class EmbeddingService:
    """Service for generating text embeddings using OpenAI."""

    def __init__(self) -> None:
        """Initialize embedding service with OpenAI client."""
        self.embedder = OpenAIEmbeddings(
            model=settings.embedding_model,
            openai_api_key=SecretStr(settings.openai_api_key),
            dimensions=settings.embedding_dimension,
        )
        self.dimension = settings.embedding_dimension

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors (each is a list of floats)
        """
        if not texts:
            return []
        return await self.embedder.aembed_documents(texts)

    async def embed_query(self, query: str) -> list[float]:
        """Generate embedding for a search query.

        Args:
            query: Search query text

        Returns:
            Embedding vector as list of floats
        """
        return await self.embedder.aembed_query(query)


def get_embedding_service() -> EmbeddingService:
    """Factory function to create embedding service instance."""
    return EmbeddingService()
