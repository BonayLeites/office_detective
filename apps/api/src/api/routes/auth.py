"""Authentication endpoints."""

from fastapi import APIRouter, HTTPException, status

from src.dependencies import CurrentUser, DbSession
from src.schemas.user import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from src.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    db: DbSession,
) -> TokenResponse:
    """Register a new user."""
    auth_service = AuthService(db)

    try:
        user = await auth_service.register(data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    token = AuthService.create_access_token(user.user_id)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: DbSession,
) -> TokenResponse:
    """Authenticate user and return token."""
    auth_service = AuthService(db)
    user = await auth_service.authenticate(data.email, data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = AuthService.create_access_token(user.user_id)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: CurrentUser,
) -> UserResponse:
    """Get current authenticated user info."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_user_preferences(
    data: UserUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> UserResponse:
    """Update current user preferences."""
    auth_service = AuthService(db)
    user = await auth_service.update_preferences(current_user, data)
    return UserResponse.model_validate(user)


@router.post("/logout")
async def logout() -> dict[str, str]:
    """Logout user.

    Note: With stateless JWT, logout is handled client-side by removing the token.
    This endpoint exists for API completeness.
    """
    return {"message": "Successfully logged out"}
