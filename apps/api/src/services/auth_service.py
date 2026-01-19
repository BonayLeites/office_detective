"""Authentication service for user management and JWT handling."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.models.user import User
from src.schemas.user import UserRegister, UserUpdate

# Password hashing context using argon2 (modern, secure, no length limitations)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize service with database session."""
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        """Get user by ID."""
        result = await self.db.execute(
            select(User).where(User.user_id == user_id, User.is_active.is_(True))
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def register(self, data: UserRegister) -> User:
        """Register a new user.

        Raises:
            ValueError: If email is already taken.
        """
        # Check if email is already taken
        existing = await self.get_by_email(data.email)
        if existing:
            raise ValueError("Email already registered")

        # Hash password and create user
        user = User(
            email=data.email,
            password_hash=pwd_context.hash(data.password),
            name=data.name,
            preferred_language=data.preferred_language,
            last_login_at=datetime.now(UTC),
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        """Authenticate user by email and password.

        Returns:
            User if credentials are valid, None otherwise.
        """
        user = await self.get_by_email(email)
        if not user or not user.is_active:
            return None

        if not pwd_context.verify(password, user.password_hash):
            return None

        # Update last login timestamp
        user.last_login_at = datetime.now(UTC)
        await self.db.flush()

        return user

    async def update_preferences(self, user: User, data: UserUpdate) -> User:
        """Update user preferences."""
        if data.name is not None:
            user.name = data.name
        if data.preferred_language is not None:
            user.preferred_language = data.preferred_language

        await self.db.flush()
        await self.db.refresh(user)
        return user

    @staticmethod
    def create_access_token(user_id: UUID) -> str:
        """Create JWT access token."""
        now = datetime.now(UTC)
        expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)
        payload = {
            "sub": str(user_id),
            "exp": expire,
            "iat": now,
            "type": "access",
        }
        return jwt.encode(
            payload,
            settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )

    @staticmethod
    def decode_token(token: str) -> dict[str, str] | None:
        """Decode and validate JWT token.

        Returns:
            Token payload if valid, None otherwise.
        """
        try:
            payload: dict[str, str] = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
