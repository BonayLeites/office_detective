# Office Detective

An AI-powered investigation game where players analyze corporate documents, uncover hidden connections, and solve fraud cases using semantic search and knowledge graph reasoning.

[![CI](https://github.com/bonay/office-detective/actions/workflows/ci.yml/badge.svg)](https://github.com/bonay/office-detective/actions/workflows/ci.yml)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Demo

<p align="center">
  <img src=".github/assets/demo.gif" alt="Office Detective Demo" width="800">
</p>

---

## Features

- **AI Investigation Assistant** - Chat with an AI agent that searches documents, analyzes evidence, and provides cited responses
- **Semantic Search** - Find relevant documents using natural language queries powered by OpenAI embeddings and pgvector
- **Knowledge Graph** - Visualize entity relationships with Neo4j, discover hidden connections between suspects
- **Evidence Board** - Interactive graph visualization to pin evidence and build your case theory
- **Document Analysis** - Review emails, chat logs, invoices, and tickets from the case dossier
- **Grounded Responses** - Every AI response includes citations linking back to source documents

## Tech Stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Frontend | Next.js 15, React 19, TypeScript (strict), Tailwind CSS, Zustand |
| Backend  | FastAPI, SQLAlchemy 2.0, Pydantic v2, LangGraph                  |
| AI/ML    | OpenAI GPT-4o, text-embedding-3-small, LangChain                 |
| Database | PostgreSQL 16 + pgvector (RAG), Neo4j 5 (Knowledge Graph)        |
| Cache    | Redis 7                                                          |
| Testing  | pytest (95%+ coverage), Vitest                                   |
| DevOps   | Docker Compose, GitHub Actions CI                                |

---

## Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/)
- [Python 3.12+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Docker](https://www.docker.com/)

### Setup

```bash
# Clone and setup (installs deps, starts Docker, runs migrations, seeds data)
git clone https://github.com/bonay/office-detective.git
cd office-detective
make setup

# Add your OpenAI API key to .env
echo "OPENAI_API_KEY=sk-your-key" >> .env
echo "OPENAI_API_KEY=sk-your-key" >> apps/api/.env

# Start development servers
make dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

---

## Architecture

```
                                    ┌─────────────────┐
                                    │   Next.js 15    │
                                    │    Frontend     │
                                    └────────┬────────┘
                                             │
                                             ▼
┌─────────────────┐              ┌─────────────────────┐
│     Neo4j       │◄────────────►│     FastAPI         │
│ Knowledge Graph │              │     Backend         │
└─────────────────┘              └──────────┬──────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
           ┌───────────────┐      ┌─────────────────┐      ┌───────────────┐
           │  PostgreSQL   │      │    LangGraph    │      │     Redis     │
           │   + pgvector  │      │   ARIA Agent    │      │     Cache     │
           └───────────────┘      └─────────────────┘      └───────────────┘
```

### Key Components

| Component          | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| **ARIA Agent**     | LangGraph-based AI assistant with tool-calling for search, graph queries |
| **RAG Pipeline**   | Document chunking (512 chars) → OpenAI embeddings → pgvector similarity  |
| **Graph Engine**   | Neo4j for entity relationships, path finding, hub detection              |
| **Evidence Board** | React Flow visualization for building investigation theories             |

---

## Project Structure

```
office-detective/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   └── src/
│   │       ├── app/            # App Router pages
│   │       │   └── cases/[id]/ # Case views (inbox, chat, board, search)
│   │       ├── components/     # React components (53 total)
│   │       ├── hooks/          # Custom hooks (6)
│   │       └── stores/         # Zustand state management
│   │
│   └── api/                    # FastAPI backend
│       └── src/
│           ├── agent/          # LangGraph ARIA agent
│           ├── api/routes/     # REST endpoints (25 total)
│           ├── models/         # SQLAlchemy ORM
│           ├── schemas/        # Pydantic validation
│           └── services/       # Business logic (9 services)
│
├── infra/                      # Docker Compose configuration
├── data/cases/                 # Case templates and seed data
└── Makefile                    # Development commands
```

---

## API Reference

### Cases

| Method   | Endpoint          | Description      |
| -------- | ----------------- | ---------------- |
| `GET`    | `/api/cases`      | List all cases   |
| `GET`    | `/api/cases/{id}` | Get case details |
| `POST`   | `/api/cases`      | Create new case  |
| `DELETE` | `/api/cases/{id}` | Delete case      |

### Documents

| Method   | Endpoint                                 | Description              |
| -------- | ---------------------------------------- | ------------------------ |
| `GET`    | `/api/cases/{id}/documents`              | List case documents      |
| `GET`    | `/api/cases/{id}/documents/{docId}`      | Get document details     |
| `GET`    | `/api/cases/{id}/documents/{docId}/full` | Get document with chunks |
| `POST`   | `/api/cases/{id}/documents`              | Create document          |
| `DELETE` | `/api/cases/{id}/documents/{docId}`      | Delete document          |

### Search & AI

| Method | Endpoint                    | Description                         |
| ------ | --------------------------- | ----------------------------------- |
| `POST` | `/api/cases/{id}/search`    | Semantic search in documents        |
| `POST` | `/api/cases/{id}/chat`      | Chat with AI agent (with citations) |
| `POST` | `/api/cases/{id}/chat/hint` | Get AI-generated hint               |

### Knowledge Graph

| Method | Endpoint                                | Description                |
| ------ | --------------------------------------- | -------------------------- |
| `POST` | `/api/cases/{id}/graph/sync`            | Sync case to Neo4j         |
| `POST` | `/api/cases/{id}/graph/path`            | Find path between entities |
| `GET`  | `/api/cases/{id}/graph/neighbors/{eid}` | Get entity neighbors       |
| `GET`  | `/api/cases/{id}/graph/hubs`            | Find communication hubs    |
| `GET`  | `/api/cases/{id}/graph/stats`           | Get graph statistics       |

---

## Development

### Commands

```bash
make help         # Show all commands
make setup        # Full setup (install, docker, migrate, seed)
make dev          # Start frontend + backend servers

make test         # Run all tests
make test-api     # Run backend tests only
make test-web     # Run frontend tests only

make lint         # Run linters
make format       # Format code
make typecheck    # Run type checkers

make clean        # Stop Docker and remove volumes
```

### Manual Commands

```bash
# Frontend (apps/web/)
pnpm dev              # Development server
pnpm build            # Production build
pnpm test             # Run Vitest tests
pnpm lint             # ESLint check

# Backend (apps/api/)
uv run uvicorn src.main:app --reload    # Development server
uv run pytest                            # Run tests with coverage
uv run ruff check . && uv run ruff format .  # Lint and format
uv run mypy .                            # Type check
uv run alembic upgrade head              # Run migrations

# Docker
docker compose -f infra/docker-compose.yml up -d    # Start services
docker compose -f infra/docker-compose.yml down -v  # Stop and reset
```

---

## Environment Variables

Copy `.env.example` to `.env` and `apps/api/.env`:

| Variable         | Description                      | Default                    |
| ---------------- | -------------------------------- | -------------------------- |
| `OPENAI_API_KEY` | OpenAI API key (required for AI) | -                          |
| `OPENAI_MODEL`   | Chat model                       | `gpt-4o`                   |
| `POSTGRES_*`     | PostgreSQL connection            | Works with Docker defaults |
| `NEO4J_*`        | Neo4j connection                 | Works with Docker defaults |
| `REDIS_URL`      | Redis connection                 | `redis://localhost:6379`   |

---

## Testing

### Backend

```bash
cd apps/api
uv run pytest                    # Run all tests
uv run pytest -v                 # Verbose output
uv run pytest -k "test_search"   # Run specific tests
uv run pytest --cov-report=html  # Generate HTML coverage report
```

Coverage requirement: **95%+**

### Frontend

```bash
cd apps/web
pnpm test              # Run once
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
```

---

## License

MIT
