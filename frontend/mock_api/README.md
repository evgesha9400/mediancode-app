# Mock API

Mock API for Median Code with Clerk JWT authentication and in-memory data storage.

## Setup

1. Install dependencies:
```bash
cd mock_api
poetry install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Configure Clerk environment variables in `.env`:
- `CLERK_JWKS_URL`: Your Clerk JWKS URL
- `CLERK_ISSUER`: Your Clerk issuer URL

## Running

Start the development server:
```bash
poetry run uvicorn mock_api.main:app --reload --host 0.0.0.0 --port 8000
```

Visit Swagger UI at: http://localhost:8000/docs

## Testing

Run tests:
```bash
poetry run pytest
```

Run tests with coverage:
```bash
poetry run pytest --cov=mock_api --cov-report=term-missing
```

Run tests quietly:
```bash
poetry run pytest -q
```

## API Endpoints

All endpoints are prefixed with `/api/mock/` and require Clerk Bearer JWT authentication.

- `GET /api/mock/types` - List all types (scoped to user/account)
- `GET /api/mock/types/{id}` - Get type by ID
- `GET /api/mock/validators` - List all validators (scoped to user/account)
- `GET /api/mock/validators/{id}` - Get validator by ID
- `GET /api/mock/fields` - List all fields (scoped to user/account)
- `GET /api/mock/fields/{id}` - Get field by ID
- `GET /api/mock/objects` - List all objects (scoped to user/account)
- `GET /api/mock/objects/{id}` - Get object by ID

All list endpoints support pagination via `limit` and `offset` query parameters.

## Project Structure

```
mock_api/
├── src/mock_api/
│   ├── schema/
│   │   └── definitions.json     # JSON schema (source of truth)
│   ├── fixtures/
│   │   └── data.json            # Seed data
│   ├── models/                  # Pydantic models
│   ├── auth/                    # Clerk JWT authentication
│   ├── data/                    # In-memory data access layer
│   ├── routes/                  # API route handlers
│   └── main.py                  # FastAPI application
└── tests/                       # pytest tests mirroring src/
```

## Authentication

The API uses Clerk Bearer JWT tokens for authentication. Data is automatically scoped to the authenticated user's `owner_id` and `account_id` claims from the JWT.

To authenticate in Swagger UI:
1. Click "Authorize" button
2. Enter your Clerk JWT token in the format: `Bearer <token>`
3. All requests will include this token automatically

## Data

The API uses JSON fixtures as the data source. Data is loaded into memory at startup and filtered by user/account scope on each request. All resources include default values defined in the schema.
