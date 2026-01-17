"""FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import cases, chat, documents, entities, graph, health, search
from src.config import settings
from src.db.neo4j import close_neo4j_driver, get_neo4j_driver


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup - initialize Neo4j connection
    await get_neo4j_driver()
    yield
    # Shutdown - close Neo4j connection
    await close_neo4j_driver()


app = FastAPI(
    title="Office Detective API",
    description="Backend API for the Office Detective investigation game",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(
    documents.router, prefix="/api/cases/{case_id}/documents", tags=["documents"]
)
app.include_router(
    entities.router, prefix="/api/cases/{case_id}/entities", tags=["entities"]
)
app.include_router(
    search.router, prefix="/api/cases/{case_id}", tags=["search"]
)
app.include_router(
    graph.router, prefix="/api/cases/{case_id}", tags=["graph"]
)
app.include_router(chat.router, prefix="/api", tags=["chat"])
