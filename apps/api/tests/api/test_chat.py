"""Tests for chat API endpoints."""

import uuid
from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from langchain_core.messages import AIMessage
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, ScenarioType


@pytest.fixture
async def chat_test_case(db_session: AsyncSession) -> Case:
    """Create a test case for chat API tests."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Chat Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=99999,
        briefing="Test briefing for chat tests",
        ground_truth_json={
            "culprits": [{"entity_id": str(uuid.uuid4())}],
            "mechanism": "Test fraud mechanism for hints",
        },
    )
    db_session.add(case)
    await db_session.commit()
    await db_session.refresh(case)
    return case


@pytest.fixture
def mock_agent_graph() -> Generator[MagicMock, None, None]:
    """Mock the ARIA agent graph."""
    with patch("src.services.agent_service.create_aria_graph") as mock_create:
        mock_graph = MagicMock()
        mock_graph.ainvoke = AsyncMock(
            return_value={
                "messages": [
                    AIMessage(
                        content="Based on my analysis, I found suspicious activity.",
                        tool_calls=[],
                    )
                ],
                "retrieved_chunks": [],
                "citations": [],
            }
        )
        mock_create.return_value = mock_graph
        yield mock_create


@pytest.fixture
def mock_embedding_service() -> Generator[MagicMock, None, None]:
    """Mock embedding service for agent."""
    with patch("src.services.agent_service.EmbeddingService") as mock_class:
        mock_service = MagicMock()
        mock_service.embed_query = AsyncMock(return_value=[0.1] * 1536)
        mock_service.embed_documents = AsyncMock(side_effect=lambda x: [[0.1] * 1536] * len(x))
        mock_class.return_value = mock_service
        yield mock_service


@pytest.mark.asyncio
async def test_chat_with_aria_success(
    client: AsyncClient,
    chat_test_case: Case,
    mock_agent_graph: MagicMock,
    mock_embedding_service: MagicMock,
) -> None:
    """POST /cases/{case_id}/chat returns agent response."""
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat",
        json={"message": "What suspicious activity is there?"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "citations" in data
    assert "conversation_id" in data
    assert "suspicious activity" in data["message"]


@pytest.mark.asyncio
async def test_chat_case_not_found(
    client: AsyncClient,
    mock_agent_graph: MagicMock,
) -> None:
    """POST /cases/{case_id}/chat returns 404 for missing case."""
    fake_id = uuid.uuid4()
    response = await client.post(
        f"/api/cases/{fake_id}/chat",
        json={"message": "Test message"},
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_chat_empty_message_rejected(
    client: AsyncClient,
    chat_test_case: Case,
) -> None:
    """POST /cases/{case_id}/chat rejects empty message."""
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat",
        json={"message": ""},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_with_conversation_id(
    client: AsyncClient,
    chat_test_case: Case,
    mock_agent_graph: MagicMock,
    mock_embedding_service: MagicMock,
) -> None:
    """POST /cases/{case_id}/chat accepts conversation_id."""
    conv_id = uuid.uuid4()
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat",
        json={
            "message": "Follow-up question",
            "conversation_id": str(conv_id),
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["conversation_id"] == str(conv_id)


@pytest.mark.asyncio
async def test_hint_endpoint_success(
    client: AsyncClient,
    chat_test_case: Case,
) -> None:
    """POST /cases/{case_id}/chat/hint returns hint."""
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat/hint",
        json={},
    )

    assert response.status_code == 200
    data = response.json()
    assert "hint" in data
    assert "hints_remaining" in data
    assert data["hints_remaining"] >= 0


@pytest.mark.asyncio
async def test_hint_with_context(
    client: AsyncClient,
    chat_test_case: Case,
) -> None:
    """POST /cases/{case_id}/chat/hint uses provided context."""
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat/hint",
        json={"context": "invoices"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "invoices" in data["hint"]


@pytest.mark.asyncio
async def test_hint_case_not_found(
    client: AsyncClient,
) -> None:
    """POST /cases/{case_id}/chat/hint returns 404 for missing case."""
    fake_id = uuid.uuid4()
    response = await client.post(
        f"/api/cases/{fake_id}/chat/hint",
        json={},
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_chat_response_includes_suggested_actions(
    client: AsyncClient,
    chat_test_case: Case,
    mock_agent_graph: MagicMock,
    mock_embedding_service: MagicMock,
) -> None:
    """POST /cases/{case_id}/chat includes suggested actions."""
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat",
        json={"message": "What should I look at?"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "suggested_actions" in data
    assert isinstance(data["suggested_actions"], list)


@pytest.mark.asyncio
async def test_chat_message_too_long(
    client: AsyncClient,
    chat_test_case: Case,
) -> None:
    """POST /cases/{case_id}/chat rejects message over 2000 chars."""
    long_message = "x" * 2001
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat",
        json={"message": long_message},
    )

    assert response.status_code == 422


# --- Language Parameter Tests ---


@pytest.mark.asyncio
async def test_chat_with_spanish_language(
    client: AsyncClient,
    chat_test_case: Case,
    mock_agent_graph: MagicMock,
    mock_embedding_service: MagicMock,
) -> None:
    """POST /cases/{case_id}/chat accepts language=es query parameter."""
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat?language=es",
        json={"message": "¿Quién es sospechoso?"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    # Verify the agent was called (graph mock was invoked)
    mock_agent_graph.return_value.ainvoke.assert_called()


@pytest.mark.asyncio
async def test_chat_with_invalid_language_rejected(
    client: AsyncClient,
    chat_test_case: Case,
) -> None:
    """POST /cases/{case_id}/chat rejects invalid language codes."""
    # Invalid format (not 2 lowercase letters)
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat?language=invalid",
        json={"message": "Test message"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_with_uppercase_language_rejected(
    client: AsyncClient,
    chat_test_case: Case,
) -> None:
    """POST /cases/{case_id}/chat rejects uppercase language codes."""
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat?language=EN",
        json={"message": "Test message"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_defaults_to_english(
    client: AsyncClient,
    chat_test_case: Case,
    mock_agent_graph: MagicMock,
    mock_embedding_service: MagicMock,
) -> None:
    """POST /cases/{case_id}/chat defaults to English when no language specified."""
    response = await client.post(
        f"/api/cases/{chat_test_case.case_id}/chat",
        json={"message": "Test without language param"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
