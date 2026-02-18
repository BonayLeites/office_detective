FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

WORKDIR /app/apps/api

RUN pip install --no-cache-dir uv

COPY apps/api/pyproject.toml apps/api/uv.lock ./
COPY apps/api/README.md ./README.md
RUN uv sync --frozen --all-extras

COPY apps/api ./
COPY data /app/data

EXPOSE 8000

CMD ["sh", "-c", "uv run alembic upgrade head && uv run python -m src.scripts.seed_mallory && uv run uvicorn src.main:app --host 0.0.0.0 --port 8000"]
