"""Pytest configuration and fixtures."""

import asyncio
import os
import re
import subprocess
import sys
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from pathlib import Path

import asyncpg  # type: ignore[import-untyped]
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


@pytest.fixture(scope="session", autouse=True)
def ensure_test_database_exists() -> None:
    """Ensure tests run against an isolated test database."""
    asyncio.run(_ensure_test_database_exists_async())


async def _ensure_test_database_exists_async() -> None:
    """Async implementation for creating/validating test DB."""
    db_name = settings.postgres_db
    allow_non_test = os.getenv("ALLOW_NON_TEST_DB") == "1"
    if "test" not in db_name.lower() and not allow_non_test:
        raise RuntimeError(
            "Refusing to run tests against non-test database. "
            "Set POSTGRES_DB to a *_test database name."
        )

    if not re.fullmatch(r"[A-Za-z0-9_]+", db_name):
        raise RuntimeError("POSTGRES_DB contains unsupported characters")

    admin_db = os.getenv("POSTGRES_ADMIN_DB", "postgres")
    admin_conn = await asyncpg.connect(
        user=settings.postgres_user,
        password=settings.postgres_password,
        host=settings.postgres_host,
        port=settings.postgres_port,
        database=admin_db,
    )
    try:
        exists = await admin_conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", db_name)
        if not exists:
            await admin_conn.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        await admin_conn.close()


@pytest.fixture(scope="session", autouse=True)
def ensure_test_schema(ensure_test_database_exists: None) -> None:
    """Create required schema objects when running tests in a fresh DB."""
    asyncio.run(_ensure_test_schema_async())

    env = dict(os.environ)
    env["POSTGRES_DB"] = settings.postgres_db
    subprocess.run(  # noqa: S603
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=Path(__file__).resolve().parents[1],
        env=env,
        check=True,
    )


async def _ensure_test_schema_async() -> None:
    """Async implementation for preparing schema + migrations."""
    conn = await asyncpg.connect(
        user=settings.postgres_user,
        password=settings.postgres_password,
        host=settings.postgres_host,
        port=settings.postgres_port,
        database=settings.postgres_db,
    )
    try:
        has_cases_table = await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'cases'
            )
            """
        )
        if not has_cases_table:
            init_sql_path = Path(__file__).resolve().parents[3] / "infra" / "postgres" / "init.sql"
            init_sql = init_sql_path.read_text(encoding="utf-8")
            for statement in _split_sql_statements(init_sql):
                await conn.execute(statement)
    finally:
        await conn.close()


def _split_sql_statements(sql: str) -> list[str]:
    """Split SQL script into executable statements, handling dollar quotes."""
    statements: list[str] = []
    current: list[str] = []
    in_single_quote = False
    in_double_quote = False
    in_line_comment = False
    dollar_tag: str | None = None
    i = 0

    while i < len(sql):
        ch = sql[i]
        nxt = sql[i + 1] if i + 1 < len(sql) else ""

        if in_line_comment:
            current.append(ch)
            if ch == "\n":
                in_line_comment = False
            i += 1
            continue

        if dollar_tag is not None:
            if sql.startswith(dollar_tag, i):
                current.append(dollar_tag)
                i += len(dollar_tag)
                dollar_tag = None
                continue
            current.append(ch)
            i += 1
            continue

        if not in_single_quote and not in_double_quote and ch == "-" and nxt == "-":
            in_line_comment = True
            current.append(ch)
            current.append(nxt)
            i += 2
            continue

        if not in_double_quote and ch == "'":
            in_single_quote = not in_single_quote
            current.append(ch)
            i += 1
            continue

        if not in_single_quote and ch == '"':
            in_double_quote = not in_double_quote
            current.append(ch)
            i += 1
            continue

        if not in_single_quote and not in_double_quote and ch == "$":
            match = re.match(r"(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)", sql[i:])
            if match:
                dollar_tag = match.group(1)
                current.append(dollar_tag)
                i += len(dollar_tag)
                continue

        if not in_single_quote and not in_double_quote and ch == ";":
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
            i += 1
            continue

        current.append(ch)
        i += 1

    tail = "".join(current).strip()
    if tail:
        statements.append(tail)
    return statements


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
        email=f"test-{uuid.uuid4()}@example.com",
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
