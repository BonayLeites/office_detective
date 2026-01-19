"""Tests for authentication endpoints and AuthService."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.services.auth_service import AuthService

# ============================================================================
# AuthService Tests
# ============================================================================


@pytest.fixture
async def auth_service(db_session: AsyncSession) -> AuthService:
    """Create an AuthService instance for testing."""
    return AuthService(db_session)


@pytest.fixture
async def clean_users(db_session: AsyncSession) -> None:
    """Clean all users before test."""
    await db_session.execute(delete(User))
    await db_session.commit()


@pytest.mark.asyncio
async def test_password_hashing() -> None:
    """AuthService.hash_password and verify_password work correctly."""
    password = "mysecretpassword"
    hashed = AuthService.hash_password(password)

    # Hash should be different from original
    assert hashed != password

    # Verification should work
    assert AuthService.verify_password(password, hashed) is True
    assert AuthService.verify_password("wrongpassword", hashed) is False


@pytest.mark.asyncio
async def test_create_and_decode_token() -> None:
    """AuthService.create_access_token and decode_token work correctly."""
    user_id = uuid.uuid4()
    token = AuthService.create_access_token(user_id)

    # Token should be a string
    assert isinstance(token, str)
    assert len(token) > 0

    # Decode should return payload
    payload = AuthService.decode_token(token)
    assert payload is not None
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "access"


@pytest.mark.asyncio
async def test_decode_invalid_token() -> None:
    """AuthService.decode_token returns None for invalid tokens."""
    assert AuthService.decode_token("invalid.token.here") is None
    assert AuthService.decode_token("") is None
    assert AuthService.decode_token("notavalidjwt") is None


@pytest.mark.asyncio
async def test_register_user(
    auth_service: AuthService, clean_users: None, db_session: AsyncSession
) -> None:
    """AuthService.register creates a new user."""
    from src.schemas.user import UserRegister

    data = UserRegister(
        email="newuser@example.com",
        password="securepassword123",
        name="New User",
        preferred_language="es",
    )

    user = await auth_service.register(data)

    assert user is not None
    assert user.email == "newuser@example.com"
    assert user.name == "New User"
    assert user.preferred_language == "es"
    assert user.is_active is True
    # Password should be hashed
    assert user.password_hash != "securepassword123"
    assert AuthService.verify_password("securepassword123", user.password_hash)


@pytest.mark.asyncio
async def test_register_duplicate_email(auth_service: AuthService, sample_user: User) -> None:
    """AuthService.register raises ValueError for duplicate email."""
    from src.schemas.user import UserRegister

    data = UserRegister(
        email=sample_user.email,  # Same email as sample_user
        password="anotherpassword",
        name="Another User",
    )

    with pytest.raises(ValueError, match="Email already registered"):
        await auth_service.register(data)


@pytest.mark.asyncio
async def test_authenticate_success(auth_service: AuthService, sample_user: User) -> None:
    """AuthService.authenticate returns user for valid credentials."""
    user = await auth_service.authenticate("test@example.com", "testpassword123")

    assert user is not None
    assert user.user_id == sample_user.user_id
    assert user.email == sample_user.email


@pytest.mark.asyncio
async def test_authenticate_wrong_password(auth_service: AuthService, sample_user: User) -> None:
    """AuthService.authenticate returns None for wrong password."""
    user = await auth_service.authenticate("test@example.com", "wrongpassword")
    assert user is None


@pytest.mark.asyncio
async def test_authenticate_nonexistent_user(auth_service: AuthService) -> None:
    """AuthService.authenticate returns None for nonexistent user."""
    user = await auth_service.authenticate("nobody@example.com", "anypassword")
    assert user is None


@pytest.mark.asyncio
async def test_get_by_id(auth_service: AuthService, sample_user: User) -> None:
    """AuthService.get_by_id returns user when exists."""
    user = await auth_service.get_by_id(sample_user.user_id)
    assert user is not None
    assert user.user_id == sample_user.user_id


@pytest.mark.asyncio
async def test_get_by_id_not_found(auth_service: AuthService) -> None:
    """AuthService.get_by_id returns None when user doesn't exist."""
    user = await auth_service.get_by_id(uuid.uuid4())
    assert user is None


@pytest.mark.asyncio
async def test_update_preferences(auth_service: AuthService, sample_user: User) -> None:
    """AuthService.update_preferences updates user preferences."""
    from src.schemas.user import UserUpdate

    data = UserUpdate(name="Updated Name", preferred_language="es")
    updated = await auth_service.update_preferences(sample_user, data)

    assert updated.name == "Updated Name"
    assert updated.preferred_language == "es"


# ============================================================================
# API Endpoint Tests
# ============================================================================


@pytest.mark.asyncio
async def test_register_endpoint(client: AsyncClient, clean_users: None) -> None:
    """POST /api/auth/register creates user and returns token."""
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "securepassword123",
            "name": "New User",
            "preferred_language": "en",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["name"] == "New User"


@pytest.mark.asyncio
async def test_register_endpoint_duplicate_email(client: AsyncClient, sample_user: User) -> None:
    """POST /api/auth/register returns 400 for duplicate email."""
    response = await client.post(
        "/api/auth/register",
        json={
            "email": sample_user.email,
            "password": "anotherpassword123",
            "name": "Another User",
        },
    )

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_endpoint_invalid_password(client: AsyncClient) -> None:
    """POST /api/auth/register returns 422 for short password."""
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "user@example.com",
            "password": "short",  # Less than 8 chars
            "name": "User",
        },
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_endpoint_success(client: AsyncClient, sample_user: User) -> None:
    """POST /api/auth/login returns token for valid credentials."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_login_endpoint_invalid_credentials(client: AsyncClient, sample_user: User) -> None:
    """POST /api/auth/login returns 401 for invalid credentials."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "wrongpassword",
        },
    )

    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_me_endpoint_authenticated(
    client: AsyncClient, sample_user: User, auth_headers: dict[str, str]
) -> None:
    """GET /api/auth/me returns current user when authenticated."""
    response = await client.get("/api/auth/me", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert data["user_id"] == str(sample_user.user_id)


@pytest.mark.asyncio
async def test_get_me_endpoint_unauthenticated(client: AsyncClient) -> None:
    """GET /api/auth/me returns 401 when not authenticated."""
    response = await client.get("/api/auth/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_endpoint_invalid_token(client: AsyncClient) -> None:
    """GET /api/auth/me returns 401 for invalid token."""
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalidtoken"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_me_endpoint(
    client: AsyncClient, sample_user: User, auth_headers: dict[str, str]
) -> None:
    """PATCH /api/auth/me updates user preferences."""
    response = await client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={"name": "Updated Name", "preferred_language": "es"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["preferred_language"] == "es"


@pytest.mark.asyncio
async def test_update_me_endpoint_partial(
    client: AsyncClient, sample_user: User, auth_headers: dict[str, str]
) -> None:
    """PATCH /api/auth/me allows partial updates."""
    response = await client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={"preferred_language": "es"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test User"  # Unchanged
    assert data["preferred_language"] == "es"


@pytest.mark.asyncio
async def test_logout_endpoint(client: AsyncClient) -> None:
    """POST /api/auth/logout returns success message."""
    response = await client.post("/api/auth/logout")

    assert response.status_code == 200
    assert "logged out" in response.json()["message"].lower()
