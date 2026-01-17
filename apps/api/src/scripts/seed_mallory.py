"""Seed the Mallory case data into the database.

Usage:
    cd apps/api
    uv run python -m src.scripts.seed_mallory
"""

import asyncio
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, ClassVar

import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import async_session_maker
from src.models import Case, DocType, Document, Entity, EntityType, ScenarioType

# Path to case data
DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / "data" / "cases" / "mallory"


def load_yaml(filepath: Path) -> dict[str, Any]:
    """Load YAML file and return contents."""
    with open(filepath, encoding="utf-8") as f:
        data: dict[str, Any] = yaml.safe_load(f)
        return data


def generate_deterministic_uuid(namespace: str, name: str) -> uuid.UUID:
    """Generate a deterministic UUID from namespace and name.

    This ensures the same entity always gets the same UUID across seeds.
    """
    namespace_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, namespace)
    return uuid.uuid5(namespace_uuid, name)


class MallorySeeder:
    """Seeder for the Mallory case."""

    SUPPORTED_LANGUAGES: ClassVar[list[str]] = ["en", "es"]

    def __init__(self, db: AsyncSession, language: str = "en"):
        self.db = db
        self.language = language
        self.case_id: uuid.UUID | None = None
        self.entity_map: dict[str, uuid.UUID] = {}  # Maps P1, O2, etc. to UUIDs

    async def seed_case(self) -> uuid.UUID:
        """Load and create the case from case.yaml."""
        case_data = load_yaml(DATA_DIR / "case.yaml")

        # Generate deterministic UUID for case (include language for uniqueness)
        case_key = f"{case_data['case_id']}_{self.language}"
        self.case_id = generate_deterministic_uuid("mallory", case_key)

        # Check if case already exists
        existing = await self.db.execute(select(Case).where(Case.case_id == self.case_id))
        if existing.scalar_one_or_none():
            print(f"Case already exists: {self.case_id}")
            return self.case_id

        # Create case
        case = Case(
            case_id=self.case_id,
            title=case_data["title"],
            scenario_type=ScenarioType(case_data["scenario_type"]),
            difficulty=case_data["difficulty"],
            seed=case_data["seed"],
            language=self.language,
            briefing=case_data["briefing"],
            ground_truth_json=case_data["ground_truth"],
        )
        self.db.add(case)
        await self.db.flush()  # Get ID without committing

        print(f"Created case: {case.title} ({self.case_id})")
        return self.case_id

    async def seed_entities(self) -> dict[str, uuid.UUID]:
        """Load and create entities from entities.yaml."""
        if not self.case_id:
            raise RuntimeError("Must seed case before entities")

        entities_data = load_yaml(DATA_DIR / "entities.yaml")

        for entity_data in entities_data["entities"]:
            entity_ref = entity_data["entity_id"]  # e.g., "P1", "O2"

            # Generate deterministic UUID
            entity_uuid = generate_deterministic_uuid("mallory", entity_ref)
            self.entity_map[entity_ref] = entity_uuid

            # Check if entity already exists
            existing = await self.db.execute(select(Entity).where(Entity.entity_id == entity_uuid))
            if existing.scalar_one_or_none():
                print(f"  Entity already exists: {entity_data['name']} ({entity_ref})")
                continue

            entity = Entity(
                entity_id=entity_uuid,
                case_id=self.case_id,
                entity_type=EntityType(entity_data["entity_type"]),
                name=entity_data["name"],
                attrs_json=entity_data.get("attrs", {}),
            )
            self.db.add(entity)
            print(f"  Created entity: {entity.name} ({entity_ref})")

        await self.db.flush()
        print(f"Seeded {len(self.entity_map)} entities")
        return self.entity_map

    async def seed_documents(self) -> list[uuid.UUID]:
        """Load and create documents from documents/*.yaml."""
        if not self.case_id:
            raise RuntimeError("Must seed case before documents")

        docs_dir = DATA_DIR / "documents"
        doc_files = sorted(docs_dir.glob("DOC-*.yaml"))

        doc_ids: list[uuid.UUID] = []

        for doc_file in doc_files:
            doc_data = load_yaml(doc_file)
            doc_ref = doc_data["doc_id"]  # e.g., "DOC-001"

            # Generate deterministic UUID
            doc_uuid = generate_deterministic_uuid("mallory", doc_ref)

            # Check if document already exists
            existing = await self.db.execute(select(Document).where(Document.doc_id == doc_uuid))
            if existing.scalar_one_or_none():
                print(f"  Document already exists: {doc_ref}")
                doc_ids.append(doc_uuid)
                continue

            # Resolve author entity
            author_entity_id: uuid.UUID | None = None
            metadata = doc_data.get("metadata", {})

            # Try different fields for author
            author_ref = (
                metadata.get("from_entity") or metadata.get("author") or metadata.get("requester")
            )
            if author_ref and author_ref in self.entity_map:
                author_entity_id = self.entity_map[author_ref]

            # Parse timestamp
            ts_str = doc_data["ts"]
            if isinstance(ts_str, str):
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            else:
                ts = ts_str

            # Build metadata JSON
            meta_json = {
                "relevance": doc_data.get("relevance", "context"),
                "is_key_evidence": doc_data.get("is_key_evidence", False),
            }
            if metadata:
                meta_json.update(metadata)
            if "evidence_notes" in doc_data:
                meta_json["evidence_notes"] = doc_data["evidence_notes"]
            if "evidence_type" in doc_data:
                meta_json["evidence_type"] = doc_data["evidence_type"]

            document = Document(
                doc_id=doc_uuid,
                case_id=self.case_id,
                doc_type=DocType(doc_data["doc_type"]),
                ts=ts,
                author_entity_id=author_entity_id,
                subject=doc_data.get("subject"),
                body=doc_data["body"],
                language=self.language,
                metadata_json=meta_json,
            )
            self.db.add(document)
            doc_ids.append(doc_uuid)
            print(f"  Created document: {doc_ref} - {doc_data['title']}")

        await self.db.flush()
        print(f"Seeded {len(doc_ids)} documents")
        return doc_ids

    async def seed_all(self) -> dict[str, Any]:
        """Run the complete seeding process."""
        print("=" * 60)
        print("Seeding Mallory case...")
        print("=" * 60)

        case_id = await self.seed_case()
        entity_map = await self.seed_entities()
        doc_ids = await self.seed_documents()

        await self.db.commit()

        result = {
            "case_id": str(case_id),
            "entity_count": len(entity_map),
            "document_count": len(doc_ids),
        }

        print("=" * 60)
        print("Seeding complete!")
        print(f"  Case ID: {case_id}")
        print(f"  Entities: {len(entity_map)}")
        print(f"  Documents: {len(doc_ids)}")
        print("=" * 60)

        return result


async def seed_mallory_case(language: str = "en") -> dict[str, Any]:  # pragma: no cover
    """Main function to seed the Mallory case (CLI entry point).

    Args:
        language: Language code (default "en")

    Returns:
        Dict with seeding results
    """
    async with async_session_maker() as session:
        seeder = MallorySeeder(session, language=language)
        return await seeder.seed_all()


async def clear_mallory_case(language: str = "en") -> bool:  # pragma: no cover
    """Delete the Mallory case and all related data (CLI utility)."""
    async with async_session_maker() as session:
        # Include language suffix to match seeder behavior
        case_id = generate_deterministic_uuid("mallory", f"case_001_mallory_{language}")

        # Due to CASCADE, this will delete entities and documents too
        existing = await session.execute(select(Case).where(Case.case_id == case_id))
        case = existing.scalar_one_or_none()

        if case:
            await session.delete(case)
            await session.commit()
            print(f"Deleted case: {case_id}")
            return True

        print("Case not found")
        return False


if __name__ == "__main__":
    import sys

    # Support language argument: python -m src.scripts.seed_mallory [language]
    lang = sys.argv[1] if len(sys.argv) > 1 else "en"
    if lang not in MallorySeeder.SUPPORTED_LANGUAGES:
        print(f"Unsupported language: {lang}")
        print(f"Supported: {MallorySeeder.SUPPORTED_LANGUAGES}")
        sys.exit(1)

    asyncio.run(seed_mallory_case(language=lang))
