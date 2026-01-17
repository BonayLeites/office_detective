# Office Detective API

FastAPI backend for the Office Detective investigation game.

## Development

```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn src.main:app --reload --port 8000

# Run tests
uv run pytest

# Lint
uv run ruff check .

# Type check
uv run mypy .
```

## API Endpoints

- `GET /health` - Health check
- `GET /ready` - Readiness check
- `GET /api/cases` - List cases
- `GET /api/cases/{id}` - Get case details
- `POST /api/cases` - Create case
- `DELETE /api/cases/{id}` - Delete case
