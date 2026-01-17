"""Dependency injection for FastAPI."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from neo4j import AsyncSession as Neo4jAsyncSession
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.neo4j import get_neo4j_driver
from src.db.session import async_session_maker


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_neo4j() -> AsyncGenerator[Neo4jAsyncSession, None]:
    """Yield Neo4j session."""
    driver = await get_neo4j_driver()
    async with driver.session() as session:
        yield session


Neo4jSession = Annotated[Neo4jAsyncSession, Depends(get_neo4j)]
