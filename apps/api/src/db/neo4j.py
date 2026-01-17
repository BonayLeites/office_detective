"""Neo4j database driver management."""

from neo4j import AsyncDriver, AsyncGraphDatabase

from src.config import settings

_driver: AsyncDriver | None = None


async def get_neo4j_driver() -> AsyncDriver:
    """Get or create Neo4j async driver.

    Returns:
        AsyncDriver: Neo4j async driver instance
    """
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _driver


async def close_neo4j_driver() -> None:
    """Close Neo4j driver connection."""
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


async def verify_neo4j_connection() -> bool:
    """Verify Neo4j connection is working.

    Returns:
        bool: True if connection is successful
    """
    try:
        driver = await get_neo4j_driver()
        await driver.verify_connectivity()
        return True
    except Exception:
        return False
