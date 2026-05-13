# Shared E2E Protocol

## Purpose

Verification flow for changes that affect both `backend/` and `frontend/`.

## Ownership

- Frontend browser automation: `frontend/tests/`
- Backend end-to-end generation tests: `backend/tests/`
- This document defines the order and expectations for cross-app verification.

## Standard Verification Flow

### 1. Verify backend behavior first

```bash
make backend.test
cd backend && make test-e2e
```

Notes:
- `make test-e2e` runs backend tests marked `e2e`
- Backend E2E coverage requires Docker availability

### 2. Verify frontend correctness next

```bash
cd frontend
bun run check
bunx vitest run
bunx playwright test --project=smoke
```

### 3. Verify cross-stack CRUD flows

```bash
cd frontend
pkill -f "vite" 2>/dev/null
PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

Use this shared dev API flow when the backend change is already deployed to the development environment. To run against a local backend, replace `PUBLIC_API_BASE_URL` with the local URL.

## When This Protocol Must Be Updated

Update this file whenever any of the following change:

- Frontend Playwright project names
- Backend E2E command names
- Required environment variables
- Auth setup flow
- Shared API base URL conventions

## Minimum Evidence For Cross-Cutting Changes

For a change that spans backend and frontend, capture at least:

- Backend test result
- Frontend typecheck result
- Frontend smoke or CRUD E2E result, depending on impact

If a step is intentionally skipped, record why in the PR notes.
