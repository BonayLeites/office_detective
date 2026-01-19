"""Dependency injection for FastAPI."""

from collections.abc import AsyncGenerator
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from neo4j import AsyncSession as Neo4jAsyncSession
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.neo4j import get_neo4j_driver
from src.db.session import async_session_maker
from src.models.user import User


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


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate user from Authorization header.

    Expects: Authorization: Bearer <token>
    """
    from src.services.auth_service import AuthService

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:]  # Remove "Bearer " prefix
    payload = AuthService.decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    result = await db.execute(select(User).where(User.user_id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Get current user if authenticated, None otherwise."""
    from src.services.auth_service import AuthService

    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    payload = AuthService.decode_token(token)

    if not payload or payload.get("type") != "access":
        return None

    try:
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError):
        return None

    result = await db.execute(select(User).where(User.user_id == user_id, User.is_active.is_(True)))
    return result.scalar_one_or_none()


# Type aliases for dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
