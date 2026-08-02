FROM python:3.13-slim@sha256:afe189875f1d2f9b45e287834fb9f2c273a5d59d354ae4050ab9affbf0a6ba06 AS builder

ENV VIRTUAL_ENV="/opt/venv" \
    PATH="/opt/venv/bin:${PATH}" \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /build

RUN /usr/local/bin/python -m pip install --no-cache-dir poetry==2.3.2 \
    && /usr/local/bin/python -m venv /opt/venv

COPY pyproject.toml poetry.lock README.md ./

RUN poetry install --only main --no-root --no-ansi


FROM python:3.13-slim@sha256:afe189875f1d2f9b45e287834fb9f2c273a5d59d354ae4050ab9affbf0a6ba06 AS runtime

LABEL org.opencontainers.image.source="https://github.com/evgesha9400/mediancode-app" \
      org.opencontainers.image.description="Median Code FastAPI backend"

ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONPATH="/app/src" \
    PORT=8080 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN groupadd --gid 10001 mediancode \
    && useradd --uid 10001 --gid mediancode --no-create-home --home-dir /app mediancode

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --chown=mediancode:mediancode src/ ./src/
COPY --chown=mediancode:mediancode alembic.ini entrypoint.sh ./

RUN chmod 0555 entrypoint.sh

USER 10001:10001

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3).read()"]

ENTRYPOINT ["./entrypoint.sh"]
