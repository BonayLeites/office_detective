"""Pytest configuration and fixtures."""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import settings
from src.dependencies import get_db
from src.main import app
from src.models import Case, DocType, Document, Entity, EntityType, ScenarioType, User


@pytest.fixture
async def db_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create a test-specific async engine per test function."""
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=2,
        max_overflow=0,
    )
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Create async database session for tests."""
    session_maker = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with session_maker() as session:
        yield session
        # Rollback any uncommitted changes
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client with overridden database dependency."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Clear override after test
    app.dependency_overrides.clear()


@pytest.fixture
def case_id() -> uuid.UUID:
    """Generate a unique case ID for tests."""
    return uuid.uuid4()


@pytest.fixture
async def sample_case(db_session: AsyncSession, case_id: uuid.UUID) -> AsyncGenerator[Case, None]:
    """Create a sample case for testing."""
    from sqlalchemy import delete

    case = Case(
        case_id=case_id,
        title="Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=12345,
        briefing="Test briefing content",
        ground_truth_json={
            "culprits": [{"entity_id": "P1"}],
            "mechanism": "Test mechanism",
        },
    )
    db_session.add(case)
    await db_session.commit()
    await db_session.refresh(case)

    yield case

    # Cleanup - use delete statement to avoid session issues
    try:
        await db_session.execute(delete(Case).where(Case.case_id == case_id))
        await db_session.commit()
    except Exception:
        await db_session.rollback()


@pytest.fixture
async def sample_entity(db_session: AsyncSession, sample_case: Case) -> Entity:
    """Create a sample entity for testing."""
    entity = Entity(
        entity_id=uuid.uuid4(),
        case_id=sample_case.case_id,
        entity_type=EntityType.person,
        name="Test Person",
        attrs_json={"email": "test@example.com", "role": "Tester"},
    )
    db_session.add(entity)
    await db_session.commit()
    await db_session.refresh(entity)
    return entity


@pytest.fixture
async def sample_document(
    db_session: AsyncSession,
    sample_case: Case,
    sample_entity: Entity,
) -> Document:
    """Create a sample document for testing."""
    doc = Document(
        doc_id=uuid.uuid4(),
        case_id=sample_case.case_id,
        doc_type=DocType.email,
        ts=datetime.now(UTC),
        author_entity_id=sample_entity.entity_id,
        subject="Test Email",
        body="This is a test email body.",
        metadata_json={"relevance": "test"},
    )
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(doc)
    return doc


@pytest.fixture
async def clean_db(db_session: AsyncSession) -> None:
    """Clean all test data from database (use with caution)."""
    # Delete in reverse dependency order
    await db_session.execute(text("DELETE FROM doc_chunks"))
    await db_session.execute(text("DELETE FROM mentions"))
    await db_session.execute(text("DELETE FROM documents"))
    await db_session.execute(text("DELETE FROM entities"))
    await db_session.execute(text("DELETE FROM submissions"))
    await db_session.execute(text("DELETE FROM player_state"))
    await db_session.execute(text("DELETE FROM cases"))
    await db_session.execute(text("DELETE FROM users"))
    await db_session.commit()


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> AsyncGenerator[User, None]:
    """Create a sample user for testing."""
    from sqlalchemy import delete

    from src.services.auth_service import AuthService

    user = User(
        user_id=uuid.uuid4(),
        email="test@example.com",
        password_hash=AuthService.hash_password("testpassword123"),
        name="Test User",
        preferred_language="en",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    yield user

    # Cleanup
    try:
        await db_session.execute(delete(User).where(User.user_id == user.user_id))
        await db_session.commit()
    except Exception:
        await db_session.rollback()


@pytest.fixture
def auth_headers(sample_user: User) -> dict[str, str]:
    """Create authorization headers for authenticated requests."""
    from src.services.auth_service import AuthService

    token = AuthService.create_access_token(sample_user.user_id)
    return {"Authorization": f"Bearer {token}"}
