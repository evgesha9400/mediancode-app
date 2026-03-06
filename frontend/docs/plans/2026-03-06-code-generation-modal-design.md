# Code Generation Modal — Design Document

**Date:** 2026-03-06
**Feature:** Wire up code generation on the API detail page

## Overview

Add a "Generate Code" button to the API detail page header that opens a modal for confirming code generation. The modal shows credit cost (1 credit), triggers the backend generate endpoint, and downloads the resulting zip file.

## User Flow

1. User is on `/apis/[id]`
2. Clicks "Generate Code" button in the page header (alongside "Add Endpoint" and "Edit API")
3. Modal opens with: title, credit cost display (1 credit), Cancel + Generate buttons
4. User clicks "Generate" — button shows loading spinner, both buttons disabled
5. Backend returns zip — browser triggers download as `{api-title}.zip`
6. Modal closes automatically on success
7. On error — error message shown in modal, modal stays open, buttons re-enabled

## Component Architecture

### New Files

- `src/lib/components/modal/Modal.svelte` — Reusable modal (backdrop, centered card, close on Escape/backdrop click, focus trap, slot-based content)
- `src/lib/components/modal/index.ts` — Barrel export
- `src/lib/components/api-generator/GenerateModal.svelte` — Generation-specific modal (credit display, confirm/cancel, loading/error states, file download trigger)

### Modified Files

- `src/lib/api/client.ts` — Add `apiPostBlob()` helper (returns `Blob` instead of JSON)
- `src/lib/api/apis.ts` — Add `generateApi(apiId): Promise<Blob>`
- `src/routes/(dashboard)/apis/[id]/+page.svelte` — Add Generate Code button + render GenerateModal
- `src/lib/components/index.ts` — Add modal barrel export

## API Client Extension

### `apiPostBlob(path: string): Promise<Blob>`

- Same auth logic as existing helpers (Clerk JWT, `X-Organization-Id` header)
- Uses `response.blob()` instead of `response.json()`
- Throws `ApiError` on non-2xx (parses error body as JSON)

### `generateApi(apiId: string): Promise<Blob>`

- Calls `apiPostBlob('/apis/${apiId}/generate')`
- Returns raw zip blob

### Download Trigger

1. Call `generateApi(apiId)`
2. Create temporary `<a>` with `URL.createObjectURL(blob)`
3. Set `download` attribute to `{apiTitle}.zip`
4. Programmatically click
5. Revoke object URL

## Modal Visual Design

- **Backdrop**: `bg-black/50`, full screen fixed
- **Card**: `bg-white rounded-lg shadow-xl`, max-width `md` (28rem), centered
- **Header**: "Generate Code" — `text-lg font-semibold text-mono-900`
- **Body**: Credit cost — icon + "This will use **1 credit**" — `text-sm text-mono-600`
- **Footer**: "Cancel" (secondary) + "Generate" (primary), right-aligned
- **Loading**: Button text → "Generating..." with spinner, both buttons disabled
- **Error**: Red error message above footer buttons

No generation parameter toggles for v1 — body is minimal. Future parameters slot in between credit display and footer.

## Error Handling

- **Network error / 5xx**: Show generic error in modal, keep open, re-enable buttons
- **401/403**: Show auth error
- **Insufficient credits**: Show "Insufficient credits" if backend returns specific error
- **Empty API (no endpoints)**: No client-side validation — backend decides
- **Double-click**: Disabled button during in-flight request
- **Dismiss during generation**: Modal stays open (prevent accidental dismissal)

## Future Extensions

- Generation parameters (add database, add tests, etc.) — toggles in modal body
- Dynamic credit calculation based on selected parameters
- Credit balance display
