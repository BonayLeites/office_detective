"""Case management endpoints."""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import NAMESPACE_DNS, UUID, uuid5

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from src.db.neo4j import get_neo4j_driver
from src.dependencies import CurrentUser, DbSession
from src.models.case import Case, ScenarioType
from src.models.document import DocType, Document, Entity, EntityType
from src.models.player import PlayerState, Submission
from src.schemas.case import (
    CaseCreate,
    CaseListResponse,
    CaseResponse,
    CustomCaseCreateRequest,
    CustomCaseCreateResponse,
)
from src.schemas.submission import (
    BoardStateRequest,
    BoardStateResponse,
    ProgressResponse,
    ScoreBreakdown,
    SubmissionRequest,
    SubmissionResponse,
)
from src.services.graph_service import GraphService
from src.services.ingestion_service import IngestionService

router = APIRouter()
MAX_HINTS = 4
DEFAULT_EVIDENCE_RELIABILITY = "uncertain"
ALLOWED_EVIDENCE_RELIABILITY = frozenset({"reliable", "uncertain", "false"})
EVIDENCE_RELIABILITY_ALIASES = {
    "fiable": "reliable",
    "trusted": "reliable",
    "dudosa": "uncertain",
    "questionable": "uncertain",
    "doubtful": "uncertain",
    "unknown": "uncertain",
    "falsa": "false",
    "unreliable": "false",
}


def _parse_uuid(raw: object) -> UUID | None:
    """Parse a UUID from an arbitrary value."""
    if not isinstance(raw, str):
        return None
    try:
        return UUID(raw)
    except ValueError:
        return None


def _extract_ground_truth_culprits(ground_truth: dict[str, Any]) -> set[UUID]:
    """Extract culprit UUIDs from ground truth payload."""
    culprits = ground_truth.get("culprits", [])
    if not isinstance(culprits, list):
        return set()

    resolved: set[UUID] = set()
    mallory_namespace = uuid5(NAMESPACE_DNS, "mallory")

    for culprit in culprits:
        raw_id: object = culprit.get("entity_id") if isinstance(culprit, dict) else culprit

        parsed = _parse_uuid(raw_id)
        if parsed is not None:
            resolved.add(parsed)
            continue

        # Backward compatibility for seeded symbolic IDs like "P1".
        if isinstance(raw_id, str) and raw_id:
            resolved.add(uuid5(mallory_namespace, raw_id))

    return resolved


def _calculate_explanation_score(explanation: str, mechanism: str) -> int:
    """Calculate explanation score using simple keyword overlap."""
    explanation_tokens = {token for token in explanation.lower().split() if len(token) >= 5}
    mechanism_tokens = {token for token in mechanism.lower().split() if len(token) >= 5}

    if not explanation_tokens or not mechanism_tokens:
        return 0

    overlap = explanation_tokens.intersection(mechanism_tokens)
    return min(30, 6 + (len(overlap) * 3))


def _build_feedback(score: int, missed: int, wrong: int) -> str:
    """Build user-facing feedback summary."""
    if score >= 85 and missed == 0 and wrong == 0:
        return (
            "Excellent investigation. You identified the culprit accurately and supported your "
            "conclusion with strong evidence."
        )
    if score >= 70:
        return (
            "Good investigation overall. Your conclusion is mostly correct, but you can improve "
            "by citing stronger supporting evidence."
        )
    return (
        "Your report needs more supporting evidence. Re-check relationships, approval patterns, "
        "and the strongest corroborating documents."
    )


def _normalize_name_list(raw_names: list[str]) -> list[str]:
    """Normalize and de-duplicate free-form names."""
    normalized: list[str] = []
    seen: set[str] = set()
    for raw_name in raw_names:
        if not isinstance(raw_name, str):
            continue
        name = " ".join(part for part in raw_name.strip().split() if part)
        if len(name) < 2:
            continue
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(name)
    return normalized


def _default_people_names(language: str) -> list[str]:
    """Get default people names for guided case creation."""
    if language == "es":
        return [
            "Lucia Perez",
            "Diego Ramos",
            "Marta Solis",
            "Carlos Nunez",
            "Nora Vega",
            "Javier Mendez",
        ]
    return [
        "Maya Reed",
        "Ethan Cole",
        "Sofia Turner",
        "Liam Brooks",
        "Ava Kim",
        "Noah Patel",
    ]


def _default_company_name(language: str) -> str:
    """Get fallback company name for custom cases."""
    if language == "es":
        return "Oficina Prisma"
    return "Prism Office Group"


def _company_domain(company_name: str) -> str:
    """Derive a simple email domain from company name."""
    sanitized = "".join(ch.lower() if ch.isalnum() else "-" for ch in company_name)
    collapsed = "-".join(part for part in sanitized.split("-") if part)
    return collapsed or "office-group"


def _name_to_email(name: str, domain: str) -> str:
    """Create deterministic email-like identifiers for generated entities."""
    tokens = [
        "".join(ch.lower() for ch in token if ch.isalnum())
        for token in name.split()
        if token.strip()
    ]
    tokens = [token for token in tokens if token]
    if not tokens:
        return f"user@{domain}.local"
    handle = tokens[0]
    if len(tokens) > 1:
        handle = f"{tokens[0]}.{tokens[-1]}"
    return f"{handle}@{domain}.local"


def _scenario_label(scenario_type: ScenarioType, language: str) -> str:
    """Human-friendly scenario label in selected language."""
    english = {
        ScenarioType.vendor_fraud: "Vendor Fraud",
        ScenarioType.data_leak: "Data Leak",
        ScenarioType.inventory_manipulation: "Inventory Manipulation",
        ScenarioType.internal_sabotage: "Internal Sabotage",
        ScenarioType.expense_fraud: "Expense Fraud",
    }
    spanish = {
        ScenarioType.vendor_fraud: "Fraude de proveedor",
        ScenarioType.data_leak: "Fuga de datos",
        ScenarioType.inventory_manipulation: "Manipulacion de inventario",
        ScenarioType.internal_sabotage: "Sabotaje interno",
        ScenarioType.expense_fraud: "Fraude de gastos",
    }
    if language == "es":
        return spanish.get(scenario_type, "Caso interno")
    return english.get(scenario_type, "Internal Case")


def _build_custom_title(
    *,
    idea: str,
    scenario_type: ScenarioType,
    company_name: str,
    language: str,
) -> str:
    """Create a title for a custom generated case."""
    words = [word for word in idea.split() if word][:6]
    idea_prefix = " ".join(words)
    if language == "es":
        scenario = _scenario_label(scenario_type, language)
        if idea_prefix:
            return f"{scenario}: {idea_prefix}"
        return f"Caso en {company_name}"
    scenario = _scenario_label(scenario_type, language)
    if idea_prefix:
        return f"{scenario}: {idea_prefix}"
    return f"Case at {company_name}"


def _build_custom_briefing(
    *,
    idea: str,
    scenario_type: ScenarioType,
    company_name: str,
    language: str,
) -> str:
    """Create investigation briefing text from user prompt."""
    scenario = _scenario_label(scenario_type, language)
    if language == "es":
        return (
            f"Escenario: {scenario} en {company_name}.\n\n"
            f"Contexto inicial del usuario: {idea}\n\n"
            "Tu objetivo es identificar a la persona responsable, reconstruir el mecanismo "
            "y justificar tu conclusion con evidencia documental."
        )
    return (
        f"Scenario: {scenario} at {company_name}.\n\n"
        f"Initial user context: {idea}\n\n"
        "Your objective is to identify the responsible person, reconstruct the mechanism, "
        "and justify your conclusion with documentary evidence."
    )


def _build_custom_mechanism(
    *,
    scenario_type: ScenarioType,
    culprit_name: str,
    company_name: str,
    language: str,
) -> str:
    """Create ground-truth mechanism text for scoring and hints."""
    if language == "es":
        mechanisms = {
            ScenarioType.vendor_fraud: (
                f"{culprit_name} desvio pagos en {company_name} usando un proveedor relacionado "
                "y aprobaciones aceleradas."
            ),
            ScenarioType.data_leak: (
                f"{culprit_name} extrajo informacion sensible de {company_name} usando accesos "
                "internos y canales no autorizados."
            ),
            ScenarioType.inventory_manipulation: (
                f"{culprit_name} altero ajustes de stock en {company_name} para ocultar faltantes "
                "y movimientos no justificados."
            ),
            ScenarioType.internal_sabotage: (
                f"{culprit_name} ejecuto cambios operativos en {company_name} para degradar "
                "servicios y luego ocultar rastros."
            ),
            ScenarioType.expense_fraud: (
                f"{culprit_name} presento gastos inflados en {company_name} mediante comprobantes "
                "repetidos y validaciones debiles."
            ),
        }
        return mechanisms.get(
            scenario_type,
            f"{culprit_name} aprovecho controles debiles en {company_name} para cometer fraude.",
        )

    mechanisms = {
        ScenarioType.vendor_fraud: (
            f"{culprit_name} diverted payments at {company_name} through a related vendor and "
            "fast-track approvals."
        ),
        ScenarioType.data_leak: (
            f"{culprit_name} exfiltrated sensitive data from {company_name} using internal access "
            "and unauthorized channels."
        ),
        ScenarioType.inventory_manipulation: (
            f"{culprit_name} manipulated stock adjustments at {company_name} to hide shortages and "
            "unsupported movements."
        ),
        ScenarioType.internal_sabotage: (
            f"{culprit_name} triggered disruptive operational changes at {company_name} and masked "
            "the audit trail."
        ),
        ScenarioType.expense_fraud: (
            f"{culprit_name} submitted inflated expenses at {company_name} using "
            "duplicated receipts and weak approvals."
        ),
    }
    return mechanisms.get(
        scenario_type,
        f"{culprit_name} exploited weak controls at {company_name} to commit internal fraud.",
    )


def _build_custom_hints(
    *,
    scenario_type: ScenarioType,
    culprit_name: str,
    language: str,
) -> list[str]:
    """Create hint lines for the generated case."""
    if language == "es":
        base = [
            "Compara quien inicia el evento con quien lo aprueba.",
            "Busca inconsistencias entre metadatos y narrativa.",
            "Revisa patrones repetidos en tiempos, montos y destinatarios.",
            f"Verifica si {culprit_name} aparece en varios puntos del flujo.",
        ]
        scenario_hint = {
            ScenarioType.vendor_fraud: "Contrasta facturas con aprobaciones y proveedor final.",
            ScenarioType.data_leak: "Cruza alertas de acceso con mensajes internos.",
            ScenarioType.inventory_manipulation: "Relaciona ajustes de stock con justificaciones.",
            ScenarioType.internal_sabotage: "Sigue el orden de cambios y tickets tecnicos.",
            ScenarioType.expense_fraud: "Valida tickets y recibos frente a politicas de gastos.",
        }.get(scenario_type, "Reconstruye la secuencia de hechos y actores.")
        return [scenario_hint, *base]

    base = [
        "Compare who initiated the action against who approved it.",
        "Look for mismatches between metadata and the written narrative.",
        "Check repeated patterns in timing, amounts, and recipients.",
        f"Verify whether {culprit_name} appears across multiple events.",
    ]
    scenario_hint = {
        ScenarioType.vendor_fraud: "Cross-check invoices, approvals, and final vendor ownership.",
        ScenarioType.data_leak: "Correlate access alerts with internal communications.",
        ScenarioType.inventory_manipulation: "Tie stock adjustments to their justification trail.",
        ScenarioType.internal_sabotage: "Follow the order of changes and technical tickets.",
        ScenarioType.expense_fraud: "Validate receipts against expense policy and approval flow.",
    }.get(scenario_type, "Reconstruct the timeline of actors and actions.")
    return [scenario_hint, *base]


def _build_custom_documents_payload(
    *,
    scenario_type: ScenarioType,
    language: str,
    idea: str,
    culprit: Entity,
    reviewer: Entity,
    analyst: Entity,
    it_owner: Entity,
    vendor_org: Entity,
) -> list[dict[str, Any]]:
    """Build synthetic office-like documents for a custom case."""
    now = datetime.now(UTC)
    amount = "48290"
    if language == "es":
        subjects = {
            ScenarioType.vendor_fraud: "Aprobacion urgente de proveedor",
            ScenarioType.data_leak: "Acceso inusual fuera de horario",
            ScenarioType.inventory_manipulation: "Ajuste de inventario sin soporte",
            ScenarioType.internal_sabotage: "Incidentes repetidos en operaciones",
            ScenarioType.expense_fraud: "Revision de gastos extraordinarios",
        }
        summary_intro = "Resumen de investigacion preliminar"
    else:
        subjects = {
            ScenarioType.vendor_fraud: "Urgent vendor approval request",
            ScenarioType.data_leak: "Unusual after-hours access",
            ScenarioType.inventory_manipulation: "Inventory adjustment without support",
            ScenarioType.internal_sabotage: "Repeated operations incidents",
            ScenarioType.expense_fraud: "Extraordinary expense review",
        }
        summary_intro = "Preliminary investigation summary"

    scenario_subject = subjects.get(scenario_type, "Suspicious internal activity")
    second_doc_type = DocType.invoice if scenario_type != ScenarioType.data_leak else DocType.report

    return [
        {
            "doc_type": DocType.email,
            "ts": now - timedelta(days=4, hours=2),
            "author_entity_id": culprit.entity_id,
            "subject": scenario_subject,
            "body": (
                f"{reviewer.name}, please fast-track this item for {vendor_org.name}. "
                f"We should close it this week. Context: {idea}"
            ),
            "metadata_json": {
                "from_entity": culprit.name,
                "to_entity": reviewer.name,
                "participants": [culprit.name, reviewer.name, vendor_org.name],
            },
        },
        {
            "doc_type": second_doc_type,
            "ts": now - timedelta(days=3, hours=6),
            "author_entity_id": reviewer.entity_id,
            "subject": (
                "Invoice package"
                if scenario_type != ScenarioType.data_leak
                else "Data export activity report"
            ),
            "body": (
                f"Total amount {amount}. Linked vendor: {vendor_org.name}. "
                f"Requested by {culprit.name}. Please keep this off the wider queue."
            ),
            "metadata_json": {
                "from_entity": reviewer.name,
                "to_entity": culprit.name,
                "participants": [culprit.name, reviewer.name, vendor_org.name],
                "amount": amount,
            },
        },
        {
            "doc_type": DocType.chat,
            "ts": now - timedelta(days=2, hours=10),
            "author_entity_id": analyst.entity_id,
            "subject": "Internal chat",
            "body": (
                "I checked the logs. "
                f"{culprit.name} and {reviewer.name} touched the same workflow. "
                f"{vendor_org.name} appears again in this thread."
            ),
            "metadata_json": {
                "from_entity": analyst.name,
                "to_entity": it_owner.name,
                "participants": [analyst.name, it_owner.name, culprit.name, reviewer.name],
            },
        },
        {
            "doc_type": DocType.ticket,
            "ts": now - timedelta(days=2),
            "author_entity_id": it_owner.entity_id,
            "subject": "Security ticket: anomaly",
            "body": (
                f"Detected unusual sequence tied to {culprit.name}. "
                f"Escalating to {analyst.name} for timeline reconstruction."
            ),
            "metadata_json": {
                "from_entity": it_owner.name,
                "to_entity": analyst.name,
                "participants": [it_owner.name, analyst.name, culprit.name],
            },
        },
        {
            "doc_type": DocType.note,
            "ts": now - timedelta(days=1, hours=8),
            "author_entity_id": reviewer.entity_id,
            "subject": "Manager notes",
            "body": (
                f"Need to explain why {vendor_org.name} bypassed normal checks. "
                f"Approval chain includes {culprit.name} and {reviewer.name}."
            ),
            "metadata_json": {
                "participants": [culprit.name, reviewer.name, vendor_org.name],
            },
        },
        {
            "doc_type": DocType.report,
            "ts": now - timedelta(hours=12),
            "author_entity_id": analyst.entity_id,
            "subject": summary_intro,
            "body": (
                f"Main pattern: {culprit.name} coordinated with {reviewer.name}. "
                f"Artifacts repeatedly point to {vendor_org.name}. "
                f"Case context supplied by player: {idea}"
            ),
            "metadata_json": {
                "from_entity": analyst.name,
                "to_entity": reviewer.name,
                "participants": [analyst.name, reviewer.name, culprit.name, vendor_org.name],
            },
        },
    ]


def _extract_board_state(
    hypotheses_json: dict[str, Any] | None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Extract board state payload from hypotheses JSON."""
    if not isinstance(hypotheses_json, dict):
        return [], []

    raw_board_state = hypotheses_json.get("board_state")
    if not isinstance(raw_board_state, dict):
        return [], []

    raw_items = raw_board_state.get("board_items")
    raw_edges = raw_board_state.get("board_edges")
    board_items = (
        [item for item in raw_items if isinstance(item, dict)]
        if isinstance(raw_items, list)
        else []
    )
    board_edges = (
        [edge for edge in raw_edges if isinstance(edge, dict)]
        if isinstance(raw_edges, list)
        else []
    )
    return board_items, board_edges


def _coerce_float(value: Any, fallback: float = 100.0) -> float:
    """Coerce arbitrary numeric input into a float."""
    if isinstance(value, (int, float)):
        return float(value)
    return fallback


def _normalize_evidence_reliability(value: Any) -> str:
    """Normalize incoming reliability values to known enum-like strings."""
    if not isinstance(value, str):
        return DEFAULT_EVIDENCE_RELIABILITY

    normalized = value.strip().lower()
    if not normalized:
        return DEFAULT_EVIDENCE_RELIABILITY

    mapped = EVIDENCE_RELIABILITY_ALIASES.get(normalized, normalized)
    if mapped in ALLOWED_EVIDENCE_RELIABILITY:
        return mapped

    return DEFAULT_EVIDENCE_RELIABILITY


def _sanitize_board_items(case_id: UUID, board_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize board items payload from clients."""
    sanitized: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    allowed_types = {"entity", "document", "hypothesis"}

    for item in board_items:
        node_id = item.get("id")
        node_type = item.get("type")
        if not isinstance(node_id, str) or not node_id.strip():
            continue
        if node_id in seen_ids:
            continue
        if node_type not in allowed_types:
            continue

        raw_position = item.get("position")
        position = raw_position if isinstance(raw_position, dict) else {}
        sanitized.append(
            {
                "id": node_id,
                "type": node_type,
                "caseId": str(case_id),
                "label": item.get("label")
                if isinstance(item.get("label"), str) and item.get("label").strip()
                else ("Hypothesis" if node_type == "hypothesis" else node_id),
                "position": {
                    "x": _coerce_float(position.get("x")),
                    "y": _coerce_float(position.get("y")),
                },
                "data": item.get("data") if isinstance(item.get("data"), dict) else {},
                "reliability": _normalize_evidence_reliability(item.get("reliability")),
            }
        )
        seen_ids.add(node_id)

    return sanitized


def _sanitize_board_edges(board_edges: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize manual board edges payload from clients."""
    sanitized: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for edge in board_edges:
        source = edge.get("source")
        target = edge.get("target")
        if not isinstance(source, str) or not isinstance(target, str):
            continue
        if not source or not target or source == target:
            continue

        label = edge.get("label")
        relationship_type = edge.get("relationship_type")
        if not isinstance(label, str) or not label.strip():
            if isinstance(relationship_type, str) and relationship_type:
                label = relationship_type
            else:
                label = "LINKED"
        rel_type = (
            relationship_type
            if isinstance(relationship_type, str) and relationship_type
            else str(label).upper()
        )

        edge_id = edge.get("id")
        if not isinstance(edge_id, str) or not edge_id.startswith("manual-"):
            edge_id = f"manual-{source}-{target}-{rel_type}"

        if edge_id in seen_ids:
            continue

        sanitized.append(
            {
                "id": edge_id,
                "source": source,
                "target": target,
                "label": label,
                "relationship_type": rel_type,
            }
        )
        seen_ids.add(edge_id)

    return sanitized


def _calculate_board_reasoning_score(
    board_items: list[dict[str, Any]], board_edges: list[dict[str, Any]]
) -> int:
    """Estimate board reasoning quality from structure and deduction quality."""
    node_ids = {
        item.get("id") for item in board_items if isinstance(item.get("id"), str) and item.get("id")
    }
    edge_ids = {
        edge.get("id") for edge in board_edges if isinstance(edge.get("id"), str) and edge.get("id")
    }
    node_count = len(node_ids)
    edge_count = len(edge_ids)

    if node_count == 0:
        return 0

    node_score = min(3, max(0, node_count - 1))
    edge_score = min(3, edge_count)
    node_types = {
        item.get("type")
        for item in board_items
        if isinstance(item.get("type"), str)
        and item.get("type") in {"entity", "document", "hypothesis"}
    }
    diversity_bonus = 1 if {"entity", "document"}.issubset(node_types) and edge_count > 0 else 0

    base_score = node_score + edge_score + diversity_bonus

    items_by_id: dict[str, dict[str, Any]] = {}
    for item in board_items:
        node_id = item.get("id")
        if isinstance(node_id, str) and node_id:
            items_by_id[node_id] = item

    hypothesis_ids = [
        node_id
        for node_id, item in items_by_id.items()
        if isinstance(item.get("type"), str) and item.get("type") == "hypothesis"
    ]
    if not hypothesis_ids:
        return min(10, base_score)

    deduction_score = 0
    has_explicit_reasoning_edge = False
    reasoning_types = {"SUPPORTS", "CONTRADICTS"}
    supportive_types = {"SUPPORTS", "LINKED"}

    for hypothesis_id in hypothesis_ids:
        support_score = 0
        contradiction_score = 0
        evidence_links: set[str] = set()

        for edge in board_edges:
            source = edge.get("source")
            target = edge.get("target")
            if not isinstance(source, str) or not isinstance(target, str):
                continue

            evidence_id: str | None = None
            if source == hypothesis_id:
                evidence_id = target
            elif target == hypothesis_id:
                evidence_id = source
            if evidence_id is None:
                continue

            evidence_item = items_by_id.get(evidence_id)
            if not evidence_item:
                continue
            evidence_type = evidence_item.get("type")
            if evidence_type not in {"entity", "document"}:
                continue
            evidence_links.add(evidence_id)

            raw_relation = edge.get("relationship_type")
            relation_value = raw_relation if isinstance(raw_relation, str) else edge.get("label")
            relationship_type = (
                relation_value.strip().upper()
                if isinstance(relation_value, str) and relation_value.strip()
                else "LINKED"
            )

            if relationship_type in reasoning_types:
                has_explicit_reasoning_edge = True

            reliability = _normalize_evidence_reliability(evidence_item.get("reliability"))
            if relationship_type == "CONTRADICTS":
                if reliability == "reliable":
                    contradiction_score += 2
                elif reliability == "uncertain":
                    contradiction_score += 1
            elif relationship_type in supportive_types:
                if reliability == "reliable":
                    support_score += 2
                elif reliability == "uncertain":
                    support_score += 1
                else:
                    contradiction_score += 1
            else:
                if reliability == "reliable":
                    support_score += 1

        if not evidence_links:
            continue

        if contradiction_score > support_score:
            deduction_score -= 1
        elif support_score >= 2:
            deduction_score += 2
        else:
            deduction_score += 1

    if has_explicit_reasoning_edge:
        deduction_score += 1

    return min(10, max(0, base_score + deduction_score))


async def _get_or_create_player_state(db: DbSession, user_id: UUID, case_id: UUID) -> PlayerState:
    """Get existing player state or create a new one."""
    result = await db.execute(
        select(PlayerState).where(PlayerState.user_id == user_id, PlayerState.case_id == case_id)
    )
    player_state = result.scalar_one_or_none()
    if player_state:
        return player_state

    player_state = PlayerState(
        user_id=user_id,
        case_id=case_id,
        opened_docs=[],
        pinned_items=[],
        hypotheses_json={},
        hints_used=0,
    )
    db.add(player_state)
    await db.flush()
    await db.refresh(player_state)
    return player_state


@router.get("", response_model=CaseListResponse)
async def list_cases(
    db: DbSession,
    skip: int = 0,
    limit: int = 20,
) -> CaseListResponse:
    """List all cases with pagination."""
    # Get total count
    count_result = await db.execute(select(func.count(Case.case_id)))
    total = count_result.scalar() or 0

    # Get cases with document and entity counts
    result = await db.execute(
        select(Case).order_by(Case.created_at.desc()).offset(skip).limit(limit)
    )
    cases = list(result.scalars().all())

    # Get counts for each case
    case_responses = []
    for case in cases:
        doc_count_result = await db.execute(
            select(func.count(Document.doc_id)).where(Document.case_id == case.case_id)
        )
        entity_count_result = await db.execute(
            select(func.count(Entity.entity_id)).where(Entity.case_id == case.case_id)
        )

        case_responses.append(
            CaseResponse(
                case_id=case.case_id,
                title=case.title,
                scenario_type=case.scenario_type,
                difficulty=case.difficulty,
                language=case.language,
                seed=case.seed,
                created_at=case.created_at,
                updated_at=case.updated_at,
                document_count=doc_count_result.scalar() or 0,
                entity_count=entity_count_result.scalar() or 0,
            )
        )

    return CaseListResponse(cases=case_responses, total=total)


@router.post(
    "/custom",
    response_model=CustomCaseCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_custom_case(
    request: CustomCaseCreateRequest,
    db: DbSession,
) -> CustomCaseCreateResponse:
    """Create a user-customized case with generated entities and documents."""
    warnings: list[str] = []

    language = request.language if request.language in {"en", "es"} else "en"
    scenario_type = request.scenario_type
    company_name = request.company_name.strip() if request.company_name else ""
    if not company_name:
        company_name = _default_company_name(language)

    names = _normalize_name_list(request.people_names)
    if request.culprit_name:
        names = _normalize_name_list([request.culprit_name, *names])

    for fallback_name in _default_people_names(language):
        if len(names) >= 4:
            break
        candidate = _normalize_name_list([fallback_name])
        if candidate and candidate[0].casefold() not in {name.casefold() for name in names}:
            names.append(candidate[0])

    if len(names) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one valid person name is required to create a custom case",
        )

    culprit_name = request.culprit_name.strip() if request.culprit_name else names[0]
    if culprit_name.casefold() != names[0].casefold():
        names = _normalize_name_list([culprit_name, *names])
        culprit_name = names[0]

    title = _build_custom_title(
        idea=request.idea,
        scenario_type=scenario_type,
        company_name=company_name,
        language=language,
    )
    briefing = _build_custom_briefing(
        idea=request.idea,
        scenario_type=scenario_type,
        company_name=company_name,
        language=language,
    )
    seed = int(datetime.now(UTC).timestamp()) % 1_000_000_000

    case = Case(
        title=title,
        scenario_type=scenario_type,
        difficulty=request.difficulty,
        language=language,
        seed=seed,
        briefing=briefing,
        ground_truth_json={"culprits": [], "mechanism": "", "hints": {}},
    )
    db.add(case)
    await db.flush()
    await db.refresh(case)

    domain = _company_domain(company_name)
    culprit_role = {
        ScenarioType.vendor_fraud: "Procurement Manager",
        ScenarioType.data_leak: "Data Analyst",
        ScenarioType.inventory_manipulation: "Inventory Supervisor",
        ScenarioType.internal_sabotage: "Operations Engineer",
        ScenarioType.expense_fraud: "Department Manager",
    }.get(scenario_type, "Operations Manager")

    people_specs = [
        {"name": names[0], "role": culprit_role, "team": "Operations"},
        {"name": names[1], "role": "Finance Reviewer", "team": "Finance"},
        {"name": names[2], "role": "Internal Analyst", "team": "Compliance"},
        {"name": names[3], "role": "IT Support Lead", "team": "IT"},
    ]
    for extra_name in names[4:7]:
        people_specs.append({"name": extra_name, "role": "Staff Member", "team": "General"})

    entities: list[Entity] = []
    people_entities: list[Entity] = []
    for person in people_specs:
        entity = Entity(
            case_id=case.case_id,
            entity_type=EntityType.person,
            name=person["name"],
            attrs_json={
                "role": person["role"],
                "team": person["team"],
                "email": _name_to_email(person["name"], domain),
            },
        )
        people_entities.append(entity)
        entities.append(entity)

    vendor_name = (
        f"{people_entities[0].name.split()[0]} Supplies"
        if scenario_type in {ScenarioType.vendor_fraud, ScenarioType.expense_fraud}
        else f"{company_name} External Ops"
    )
    company_entity = Entity(
        case_id=case.case_id,
        entity_type=EntityType.org,
        name=company_name,
        attrs_json={"kind": "company", "domain": f"{domain}.local"},
    )
    vendor_entity = Entity(
        case_id=case.case_id,
        entity_type=EntityType.org,
        name=vendor_name,
        attrs_json={"kind": "counterparty"},
    )
    account_entity = Entity(
        case_id=case.case_id,
        entity_type=EntityType.account,
        name=f"ACC-{seed % 100000:05d}",
        attrs_json={"owner": people_entities[0].name},
    )

    entities.extend([company_entity, vendor_entity, account_entity])
    db.add_all(entities)
    await db.flush()

    culprit = people_entities[0]
    reviewer = people_entities[1]
    analyst = people_entities[2]
    it_owner = people_entities[3]

    mechanism = _build_custom_mechanism(
        scenario_type=scenario_type,
        culprit_name=culprit.name,
        company_name=company_name,
        language=language,
    )
    hint_lines = _build_custom_hints(
        scenario_type=scenario_type,
        culprit_name=culprit.name,
        language=language,
    )

    case.ground_truth_json = {
        "culprits": [{"entity_id": str(culprit.entity_id), "name": culprit.name}],
        "mechanism": mechanism,
        "hints": {
            "tier_0": [{"text": hint} for hint in hint_lines[:2]],
            "tier_1": [{"text": hint} for hint in hint_lines[2:4]],
            "tier_2": [{"text": hint} for hint in hint_lines[4:]],
        },
        "custom_prompt": request.idea,
        "custom_inputs": {
            "company_name": company_name,
            "scenario_type": scenario_type.value,
            "participants": [person.name for person in people_entities],
        },
    }

    document_payloads = _build_custom_documents_payload(
        scenario_type=scenario_type,
        language=language,
        idea=request.idea,
        culprit=culprit,
        reviewer=reviewer,
        analyst=analyst,
        it_owner=it_owner,
        vendor_org=vendor_entity,
    )
    documents = [
        Document(
            case_id=case.case_id,
            doc_type=payload["doc_type"],
            ts=payload["ts"],
            author_entity_id=payload["author_entity_id"],
            subject=payload["subject"],
            body=payload["body"],
            language=language,
            metadata_json=payload["metadata_json"],
        )
        for payload in document_payloads
    ]
    db.add_all(documents)
    await db.flush()

    chunks_created = 0
    embeddings_created = 0
    try:
        ingestion_result = await IngestionService(db).ingest_case(
            case_id=case.case_id,
            generate_embeddings=request.generate_embeddings,
        )
        chunks_created = ingestion_result.total_chunks
        embeddings_created = ingestion_result.total_embeddings
    except Exception:
        try:
            fallback_ingestion = await IngestionService(db).ingest_case(
                case_id=case.case_id,
                generate_embeddings=False,
            )
            chunks_created = fallback_ingestion.total_chunks
            warnings.append(
                "Embeddings were not generated. Keyword search remains available for this case."
            )
        except Exception:
            warnings.append(
                "Document indexing failed. Retry ingestion from /api/cases/{case_id}/ingest."
            )

    graph_relationships_created = 0
    if request.sync_graph:
        try:
            neo4j_driver = await get_neo4j_driver()
            async with neo4j_driver.session() as neo4j:
                graph_result = await GraphService(neo4j=neo4j, db=db).sync_case(case.case_id)
                graph_relationships_created = graph_result.relationships_created
        except Exception:
            warnings.append(
                "Graph sync unavailable right now. Use board sync later when Neo4j is ready."
            )

    await db.refresh(case)

    case_response = CaseResponse(
        case_id=case.case_id,
        title=case.title,
        scenario_type=case.scenario_type,
        difficulty=case.difficulty,
        language=case.language,
        seed=case.seed,
        created_at=case.created_at,
        updated_at=case.updated_at,
        document_count=len(documents),
        entity_count=len(entities),
    )

    return CustomCaseCreateResponse(
        case=case_response,
        entities_created=len(entities),
        documents_created=len(documents),
        chunks_created=chunks_created,
        embeddings_created=embeddings_created,
        graph_relationships_created=graph_relationships_created,
        warnings=warnings,
    )


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: UUID,
    db: DbSession,
) -> CaseResponse:
    """Get a specific case by ID."""
    result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    # Get counts
    doc_count_result = await db.execute(
        select(func.count(Document.doc_id)).where(Document.case_id == case_id)
    )
    entity_count_result = await db.execute(
        select(func.count(Entity.entity_id)).where(Entity.case_id == case_id)
    )

    return CaseResponse(
        case_id=case.case_id,
        title=case.title,
        scenario_type=case.scenario_type,
        difficulty=case.difficulty,
        language=case.language,
        seed=case.seed,
        created_at=case.created_at,
        updated_at=case.updated_at,
        document_count=doc_count_result.scalar() or 0,
        entity_count=entity_count_result.scalar() or 0,
    )


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    db: DbSession,
) -> CaseResponse:
    """Create a new case."""
    case = Case(
        title=case_data.title,
        scenario_type=case_data.scenario_type,
        difficulty=case_data.difficulty,
        language=case_data.language,
        seed=case_data.seed,
        ground_truth_json=case_data.ground_truth.model_dump(mode="json"),
    )
    db.add(case)
    await db.flush()
    await db.refresh(case)

    return CaseResponse(
        case_id=case.case_id,
        title=case.title,
        scenario_type=case.scenario_type,
        difficulty=case.difficulty,
        language=case.language,
        seed=case.seed,
        created_at=case.created_at,
        updated_at=case.updated_at,
        document_count=0,
        entity_count=0,
    )


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Delete a case."""
    result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    await db.delete(case)


@router.get("/{case_id}/progress", response_model=ProgressResponse)
async def get_case_progress(
    case_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ProgressResponse:
    """Get the current player's progress for a case."""
    case_result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    player_state = await _get_or_create_player_state(db, current_user.user_id, case_id)
    latest_submission_result = await db.execute(
        select(Submission)
        .where(Submission.user_id == current_user.user_id, Submission.case_id == case_id)
        .order_by(Submission.created_at.desc())
        .limit(1)
    )
    latest_submission = latest_submission_result.scalar_one_or_none()

    last_score: int | None = None
    if latest_submission and isinstance(latest_submission.score_json, dict):
        raw_score = latest_submission.score_json.get("score")
        if isinstance(raw_score, int):
            last_score = raw_score

    hints_remaining = max(0, MAX_HINTS - player_state.hints_used)
    return ProgressResponse(
        hints_used=player_state.hints_used,
        hints_remaining=hints_remaining,
        has_submission=latest_submission is not None,
        last_score=last_score,
    )


@router.get("/{case_id}/board-state", response_model=BoardStateResponse)
async def get_case_board_state(
    case_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> BoardStateResponse:
    """Get persisted board state for the current player and case."""
    case_result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    player_state = await _get_or_create_player_state(db, current_user.user_id, case_id)
    raw_board_items, board_edges = _extract_board_state(
        player_state.hypotheses_json if isinstance(player_state.hypotheses_json, dict) else {}
    )
    board_items = _sanitize_board_items(case_id, raw_board_items)

    return BoardStateResponse(
        board_items=board_items,
        board_edges=board_edges,
        updated_at=player_state.updated_at.isoformat() if player_state.updated_at else None,
    )


@router.put("/{case_id}/board-state", response_model=BoardStateResponse)
async def save_case_board_state(
    case_id: UUID,
    request: BoardStateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> BoardStateResponse:
    """Persist board nodes and manual connections for the current player and case."""
    case_result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    player_state = await _get_or_create_player_state(db, current_user.user_id, case_id)
    board_items = _sanitize_board_items(case_id, request.board_items)
    board_edges = _sanitize_board_edges(request.board_edges)

    existing_hypotheses = (
        player_state.hypotheses_json if isinstance(player_state.hypotheses_json, dict) else {}
    )
    merged_hypotheses = dict(existing_hypotheses)
    merged_hypotheses["board_state"] = {
        "board_items": board_items,
        "board_edges": board_edges,
        "updated_at": datetime.now(UTC).isoformat(),
    }

    player_state.hypotheses_json = merged_hypotheses
    player_state.updated_at = datetime.now(UTC)

    await db.flush()
    await db.refresh(player_state)

    return BoardStateResponse(
        board_items=board_items,
        board_edges=board_edges,
        updated_at=player_state.updated_at.isoformat() if player_state.updated_at else None,
    )


@router.post("/{case_id}/submit", response_model=SubmissionResponse)
async def submit_case_report(
    case_id: UUID,
    request: SubmissionRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SubmissionResponse:
    """Submit final accusation and evidence for scoring."""
    case_result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    ground_truth = case.ground_truth_json if isinstance(case.ground_truth_json, dict) else {}
    truth_culprits = _extract_ground_truth_culprits(ground_truth)
    selected_culprits = set(request.culprit_ids)

    correct = selected_culprits.intersection(truth_culprits)
    wrong = selected_culprits.difference(truth_culprits)
    missed = truth_culprits.difference(selected_culprits)

    if truth_culprits:
        recall = len(correct) / len(truth_culprits)
    else:
        recall = 1.0 if not selected_culprits else 0.0
    precision = len(correct) / len(selected_culprits) if selected_culprits else 0.0

    culprit_score = round((recall * 24) + (precision * 16))
    culprit_score = max(0, culprit_score - (len(wrong) * 4))
    culprit_score = min(40, culprit_score)

    evidence_score = min(20, len(request.evidence_ids) * 4)
    mechanism = ground_truth.get("mechanism", "")
    explanation_score = _calculate_explanation_score(request.explanation, str(mechanism))

    player_state = await _get_or_create_player_state(db, current_user.user_id, case_id)
    board_items, board_edges = _extract_board_state(
        player_state.hypotheses_json if isinstance(player_state.hypotheses_json, dict) else {}
    )
    board_reasoning_score = _calculate_board_reasoning_score(board_items, board_edges)

    efficiency_score = 10
    if player_state.hints_used == 1:
        efficiency_score = 8
    elif player_state.hints_used == 2:
        efficiency_score = 6
    elif player_state.hints_used == 3:
        efficiency_score = 4
    elif player_state.hints_used >= 4:
        efficiency_score = 2

    total_score = min(
        100,
        culprit_score
        + evidence_score
        + explanation_score
        + efficiency_score
        + board_reasoning_score,
    )
    feedback = _build_feedback(total_score, len(missed), len(wrong))

    score_json: dict[str, Any] = {
        "score": total_score,
        "max_score": 100,
        "breakdown": {
            "culprit_score": culprit_score,
            "evidence_score": evidence_score,
            "explanation_score": explanation_score,
            "efficiency_score": efficiency_score,
            "board_reasoning_score": board_reasoning_score,
        },
    }
    submission = Submission(
        user_id=current_user.user_id,
        case_id=case_id,
        answer_json={
            "culprit_ids": [str(c) for c in request.culprit_ids],
            "explanation": request.explanation,
        },
        evidence_refs=[str(e) for e in request.evidence_ids],
        score_json=score_json,
    )
    db.add(submission)

    existing_hypotheses = (
        player_state.hypotheses_json if isinstance(player_state.hypotheses_json, dict) else {}
    )
    previous_board_state = (
        existing_hypotheses.get("board_state")
        if isinstance(existing_hypotheses.get("board_state"), dict)
        else None
    )

    player_state.hypotheses_json = {
        "culprit_ids": [str(c) for c in request.culprit_ids],
        "evidence_ids": [str(e) for e in request.evidence_ids],
        "explanation": request.explanation,
        "submitted_at": datetime.now(UTC).isoformat(),
        "score": total_score,
    }
    if previous_board_state is not None:
        player_state.hypotheses_json["board_state"] = previous_board_state
    player_state.updated_at = datetime.now(UTC)

    await db.flush()
    await db.refresh(submission)

    return SubmissionResponse(
        submission_id=submission.submission_id,
        score=total_score,
        max_score=100,
        correct_culprits=sorted(truth_culprits, key=str),
        feedback=feedback,
        breakdown=ScoreBreakdown(
            culprit_score=culprit_score,
            evidence_score=evidence_score,
            explanation_score=explanation_score,
            efficiency_score=efficiency_score,
            board_reasoning_score=board_reasoning_score,
        ),
    )
