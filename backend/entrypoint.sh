#!/bin/sh
set -e

read_secret() {
    variable_name="$1"
    file_variable_name="${variable_name}_FILE"
    eval "secret_file=\${$file_variable_name:-}"

    if [ -n "$secret_file" ]; then
        if [ ! -r "$secret_file" ]; then
            echo "$file_variable_name does not point to a readable file." >&2
            exit 1
        fi
        secret_value="$(cat "$secret_file")"
        export "$variable_name=$secret_value"
    fi
}

read_secret CLERK_SECRET_KEY
read_secret DATABASE_URL

if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_PASSWORD_FILE:-}" ]; then
    if [ ! -r "$POSTGRES_PASSWORD_FILE" ]; then
        echo "POSTGRES_PASSWORD_FILE does not point to a readable file." >&2
        exit 1
    fi

    encoded_postgres_password="$(
        python - "$POSTGRES_PASSWORD_FILE" <<'PY'
from pathlib import Path
import sys
from urllib.parse import quote

print(quote(Path(sys.argv[1]).read_text().strip(), safe=""))
PY
    )"
    export DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER:-mediancode}:${encoded_postgres_password}@${POSTGRES_HOST:-database}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-mediancode}"
fi

if [ "${DB_RESET:-false}" = "true" ]; then
    echo "DB_RESET=true — dropping and recreating schema..."
    python -c "
import asyncio, asyncpg, os
async def reset():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    await conn.execute('DROP SCHEMA IF EXISTS public CASCADE')
    await conn.execute('CREATE SCHEMA public')
    await conn.close()
asyncio.run(reset())
print('Schema reset complete.')
"
else
    echo "DB_RESET is not set — skipping schema reset."
fi

echo "Running migrations..."
alembic -c alembic.ini upgrade head
echo "Migrations complete."

echo "Starting server..."
exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8080}"
