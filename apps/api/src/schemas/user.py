"""User schemas for authentication."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=2, max_length=255)
    preferred_language: str = Field(default="en", pattern=r"^(en|es)$")


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user preferences."""

    name: str | None = Field(default=None, min_length=2, max_length=255)
    preferred_language: str | None = Field(default=None, pattern=r"^(en|es)$")


class UserResponse(BaseModel):
    """Schema for user response."""

    user_id: UUID
    email: str
    name: str
    preferred_language: str
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Schema for authentication token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
