# Quick Start Guide

## Installation

```bash
cd mock_api
poetry install
```

## Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your Clerk credentials:
```env
CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.dev
```

**For local testing without Clerk:**
```env
REQUIRE_AUTH=false
```

## Running the Server

```bash
poetry run uvicorn mock_api.main:app --reload --host 0.0.0.0 --port 8000
```

Then visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Testing

Run all tests:
```bash
poetry run pytest
```

Run with coverage:
```bash
poetry run pytest --cov=mock_api --cov-report=term-missing
```

Run specific test file:
```bash
poetry run pytest tests/test_routes/test_types.py -v
```

## API Usage

### With Clerk Authentication (Production)

```bash
# Get your Clerk JWT token from your application
TOKEN="your-clerk-jwt-token"

# List all types
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/mock/types

# Get specific type
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/mock/types/type_1

# List fields with filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/mock/fields?namespace=user&limit=10"
```

### Without Authentication (Testing with REQUIRE_AUTH=false)

```bash
# Any Bearer token works
curl -H "Authorization: Bearer test" \
  http://localhost:8000/api/mock/types
```

## Available Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### Types
- `GET /api/mock/types` - List types (paginated)
- `GET /api/mock/types/{id}` - Get type by ID

### Validators
- `GET /api/mock/validators` - List validators (paginated)
- `GET /api/mock/validators/{id}` - Get validator by ID

### Fields
- `GET /api/mock/fields` - List fields (paginated, filterable by namespace)
- `GET /api/mock/fields/{id}` - Get field by ID

### Objects
- `GET /api/mock/objects` - List objects (paginated, filterable by namespace)
- `GET /api/mock/objects/{id}` - Get object by ID

## Query Parameters

All list endpoints support:
- `limit`: Max results (default: 100, max: 1000)
- `offset`: Skip N results (default: 0)
- `namespace`: Filter by namespace (Fields and Objects only)

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/mock/fields?namespace=user&limit=5&offset=0"
```

## Common Tasks

### Add New Fixture Data

Edit `src/mock_api/fixtures/data.json`:
```json
{
  "types": [
    {
      "id": "type_new",
      "name": "New Type",
      "python_type": "custom",
      "owner_id": "user_test123",
      "account_id": "acct_test123",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

Restart the server to load new data.

### Test Data Scoping

The fixtures include two users:
- `user_test123` / `acct_test123` - Has 3 types, 3 validators, 4 fields, 2 objects
- `user_other456` / `acct_other456` - Has 1 type, 1 validator, 1 field, 1 object

When `REQUIRE_AUTH=false`, you get data for `user_test123`.

### Debug Authentication

Check config:
```bash
poetry run python -c "
import os
os.environ['REQUIRE_AUTH'] = 'false'
from mock_api.auth.clerk import get_clerk_config
get_clerk_config.cache_clear()
print(get_clerk_config())
"
```

### Check Data Counts

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "ok",
  "data": {
    "types": 4,
    "validators": 4,
    "fields": 5,
    "objects": 3
  }
}
```

## Troubleshooting

### "Missing authentication token" error

Make sure you're including the Authorization header:
```bash
curl -H "Authorization: Bearer your-token" http://localhost:8000/api/mock/types
```

### "Not authenticated" (403) error

You need to include a Bearer token, even in test mode. Any string works when `REQUIRE_AUTH=false`.

### "Authentication failed: 500: JWKS not available" error

This means `REQUIRE_AUTH=true` but Clerk credentials are not configured. Either:
1. Set `REQUIRE_AUTH=false` in `.env`, OR
2. Configure proper Clerk credentials

### Tests failing with 401 errors

Make sure `conftest.py` sets `REQUIRE_AUTH=false` before importing the app.

### Server won't start - "ModuleNotFoundError: No module named 'mock_api'"

Use Poetry to run commands:
```bash
poetry run uvicorn mock_api.main:app --reload
```

## Development Workflow

1. **Make changes** to code
2. **Run tests**: `poetry run pytest`
3. **Check coverage**: `poetry run pytest --cov=mock_api`
4. **Test manually**: Visit http://localhost:8000/docs
5. **Verify**: Check all endpoints work as expected

## Project Statistics

- **29** Python files
- **2** JSON files (schema + fixtures)
- **13** Test files
- **80** Tests (all passing)
- **83%** Test coverage
- **4** Resource types (Types, Validators, Fields, Objects)
- **8** API endpoints (list + detail for each resource)

## Next Steps

1. Integrate with your Clerk authentication
2. Add more fixture data for your use cases
3. Customize the schema for your needs
4. Deploy to your hosting platform
5. Connect your frontend application

For more details, see:
- **README.md** - Full documentation
- **IMPLEMENTATION_SUMMARY.md** - Implementation details
- **Swagger UI** - http://localhost:8000/docs (when server is running)
