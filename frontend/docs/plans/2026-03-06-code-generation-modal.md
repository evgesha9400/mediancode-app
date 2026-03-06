# Code Generation Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Generate Code" button to the API detail page that opens a modal, shows credit cost, and downloads a generated FastAPI zip file.

**Architecture:** Extend the API client with blob support, create a reusable Modal component, and a GenerateModal that wires the generation endpoint to a browser file download. The button lives in the API detail page header alongside existing action buttons.

**Tech Stack:** SvelteKit 5 (Svelte 5 runes), Tailwind CSS, Vitest + MSW for unit tests, Playwright for E2E.

---

### Task 1: Add `apiPostBlob` to API client

**Files:**
- Modify: `src/lib/api/client.ts:146-173` (after existing convenience methods)
- Test: `tests/unit/lib/api/client.test.ts`

**Step 1: Write the failing test**

Add to the end of `tests/unit/lib/api/client.test.ts`:

```typescript
describe('API Client - apiPostBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getClerk as any).mockReturnValue(null);
    (getActiveOrganizationId as any).mockReturnValue(null);
  });

  it('should return a Blob for successful response', async () => {
    const zipContent = new Uint8Array([80, 75, 3, 4]); // PK zip magic bytes
    server.use(
      http.post(`${API_BASE}/generate`, () => {
        return new HttpResponse(zipContent, {
          headers: { 'Content-Type': 'application/zip' }
        });
      })
    );

    const result = await apiPostBlob('/generate');

    expect(result).toBeInstanceOf(Blob);
    const arrayBuffer = await result.arrayBuffer();
    expect(new Uint8Array(arrayBuffer)).toEqual(zipContent);
  });

  it('should include auth and org headers', async () => {
    let capturedAuthHeader: string | null = null;
    let capturedOrgHeader: string | null = null;
    server.use(
      http.post(`${API_BASE}/auth-blob`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization');
        capturedOrgHeader = request.headers.get('X-Organization-Id');
        return new HttpResponse(new Uint8Array([1]), {
          headers: { 'Content-Type': 'application/octet-stream' }
        });
      })
    );

    (getClerk as any).mockReturnValue({
      session: { getToken: vi.fn().mockResolvedValue('blob-token') }
    });
    (getActiveOrganizationId as any).mockReturnValue('org-456');

    await apiPostBlob('/auth-blob');

    expect(capturedAuthHeader).toBe('Bearer blob-token');
    expect(capturedOrgHeader).toBe('org-456');
  });

  it('should throw ApiError with detail for non-2xx response', async () => {
    server.use(
      http.post(`${API_BASE}/fail-blob`, () => {
        return HttpResponse.json({ detail: 'Insufficient credits' }, { status: 402 });
      })
    );

    try {
      await apiPostBlob('/fail-blob');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(402);
      expect((err as ApiError).detail).toBe('Insufficient credits');
    }
  });
});
```

Update the import line at the top of the test file to include `apiPostBlob`:

```typescript
import { apiClient, apiGet, apiPost, apiPut, apiDelete, apiPostBlob, ApiError } from '$lib/api/client';
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/lib/api/client.test.ts`
Expected: FAIL — `apiPostBlob` is not exported from `$lib/api/client`

**Step 3: Write minimal implementation**

Add to the end of `src/lib/api/client.ts` (after `apiDelete`):

```typescript
/**
 * POST request that returns a Blob (for binary responses like zip files)
 */
export async function apiPostBlob(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<Blob> {
	const { skipAuth = false, ...fetchOptions } = options || {};

	const headers: HeadersInit = {
		...(options?.headers || {})
	};

	if (!skipAuth) {
		const token = await getAuthToken();
		if (token) {
			(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
		}
	}

	const orgId = getActiveOrganizationId();
	if (orgId) {
		(headers as Record<string, string>)['X-Organization-Id'] = orgId;
	}

	const url = `${API_BASE_URL}${endpoint}`;

	const response = await fetch(url, {
		...fetchOptions,
		method: 'POST',
		headers
	});

	if (!response.ok) {
		let detail: string | undefined;
		try {
			const errorBody = await response.json();
			detail = errorBody.detail || errorBody.message;
		} catch {
			// Response body is not JSON or empty
		}
		throw new ApiError(response, detail);
	}

	return response.blob();
}
```

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/lib/api/client.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```
feat(api): add apiPostBlob for binary response downloads
```

---

### Task 2: Add `generateApi` function

**Files:**
- Modify: `src/lib/api/apis.ts:120-122` (after `deleteApiApi`)
- Test: `tests/unit/lib/api/apis.test.ts`

**Step 1: Write the failing test**

Add to `tests/unit/lib/api/apis.test.ts`. Update the mock at the top to include `apiPostBlob`:

```typescript
vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiPostBlob: vi.fn()
}));
```

Update the imports:

```typescript
import { listApis, getApi, createApiApi, updateApiApi, deleteApiApi, generateApi } from '$lib/api/apis';
import { apiGet, apiPost, apiPut, apiDelete, apiPostBlob } from '$lib/api/client';
```

Add the test:

```typescript
describe('generateApi', () => {
  it('should call apiPostBlob with correct endpoint', async () => {
    const mockBlob = new Blob(['zip-content'], { type: 'application/zip' });
    (apiPostBlob as any).mockResolvedValue(mockBlob);

    const result = await generateApi('a-1');

    expect(apiPostBlob).toHaveBeenCalledWith('/apis/a-1/generate');
    expect(result).toBe(mockBlob);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/lib/api/apis.test.ts`
Expected: FAIL — `generateApi` is not exported

**Step 3: Write minimal implementation**

Add to the end of `src/lib/api/apis.ts`:

```typescript
import { apiGet, apiPost, apiPut, apiDelete, apiPostBlob } from './client';

// ... (existing code) ...

/**
 * Generate FastAPI code for an API and return as a zip blob
 */
export async function generateApi(apiId: string): Promise<Blob> {
	return apiPostBlob(`/apis/${apiId}/generate`);
}
```

Note: update the existing import at line 7 to include `apiPostBlob`.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/lib/api/apis.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```
feat(api): add generateApi function for code generation
```

---

### Task 3: Create reusable `Modal` component

**Files:**
- Create: `src/lib/components/modal/Modal.svelte`
- Create: `src/lib/components/modal/index.ts`
- Modify: `src/lib/components/index.ts:31` (add modal export)

**Step 1: Create `Modal.svelte`**

Create `src/lib/components/modal/Modal.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  interface ModalProps {
    open: boolean;
    onClose?: () => void;
    preventCloseOnOverlay?: boolean;
    maxWidth?: string;
  }

  let {
    open,
    onClose,
    preventCloseOnOverlay = false,
    maxWidth = 'max-w-md',
    children
  }: ModalProps & { children: import('svelte').Snippet } = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl.open) {
      dialogEl.close();
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!preventCloseOnOverlay) {
        onClose?.();
      }
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl && !preventCloseOnOverlay) {
      onClose?.();
    }
  }
</script>

{#if open}
  <dialog
    bind:this={dialogEl}
    onkeydown={handleKeydown}
    onclick={handleBackdropClick}
    class="backdrop:bg-black/50 bg-transparent p-0 m-0 fixed inset-0 flex items-center justify-center w-full h-full"
  >
    <div class="bg-white rounded-lg shadow-xl {maxWidth} w-full mx-4">
      {@render children()}
    </div>
  </dialog>
{/if}
```

**Step 2: Create barrel export**

Create `src/lib/components/modal/index.ts`:

```typescript
export { default as Modal } from './Modal.svelte';
export type { ModalProps } from './Modal.svelte';
```

**Step 3: Add to main barrel export**

Add to `src/lib/components/index.ts` after the pill export (line 37):

```typescript
// Modal components
export * from './modal';
```

**Step 4: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 5: Commit**

```
feat(components): add reusable Modal component
```

---

### Task 4: Create `GenerateModal` component

**Files:**
- Create: `src/lib/components/api-generator/GenerateModal.svelte`
- Modify: `src/lib/components/api-generator/index.ts` (add export)

**Step 1: Create `GenerateModal.svelte`**

Create `src/lib/components/api-generator/GenerateModal.svelte`:

```svelte
<script lang="ts">
  import { Modal } from '$lib/components/modal';
  import { generateApi } from '$lib/api/apis';

  interface GenerateModalProps {
    open: boolean;
    apiId: string;
    apiTitle: string;
    onClose: () => void;
  }

  let { open, apiId, apiTitle, onClose }: GenerateModalProps = $props();

  let generating = $state(false);
  let error = $state<string | null>(null);

  async function handleGenerate() {
    generating = true;
    error = null;

    try {
      const blob = await generateApi(apiId);

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${apiTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      error = err.detail || err.message || 'Something went wrong. Please try again.';
    } finally {
      generating = false;
    }
  }
</script>

<Modal {open} onClose={generating ? undefined : onClose} preventCloseOnOverlay={generating}>
  <div class="p-6">
    <!-- Header -->
    <h2 class="text-lg font-semibold text-mono-900 mb-4">Generate Code</h2>

    <!-- Credit cost -->
    <div class="flex items-center space-x-2 text-sm text-mono-600 mb-6">
      <i class="fa-solid fa-coins text-mono-400"></i>
      <span>This will use <strong class="text-mono-900">1 credit</strong></span>
    </div>

    <!-- Error -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
        <p class="text-sm text-red-700">{error}</p>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex justify-end space-x-2">
      <button
        type="button"
        onclick={onClose}
        disabled={generating}
        class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md transition-colors font-medium {generating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-mono-50 cursor-pointer'}"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleGenerate}
        disabled={generating}
        class="px-4 py-2 rounded-md transition-colors font-medium flex items-center space-x-2 {generating ? 'bg-mono-600 text-white cursor-not-allowed' : 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer'}"
      >
        {#if generating}
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Generating...</span>
        {:else}
          <i class="fa-solid fa-code"></i>
          <span>Generate</span>
        {/if}
      </button>
    </div>
  </div>
</Modal>
```

**Step 2: Add to barrel export**

Add to `src/lib/components/api-generator/index.ts`:

```typescript
export { default as GenerateModal } from './GenerateModal.svelte';
export type { GenerateModalProps } from './GenerateModal.svelte';
```

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Commit**

```
feat(components): add GenerateModal for code generation
```

---

### Task 5: Wire Generate button into API detail page

**Files:**
- Modify: `src/routes/(dashboard)/apis/[id]/+page.svelte`

**Step 1: Add state and import**

At the top of the `<script>` block, add to the imports from `'$lib/components'`:

```typescript
import {
  DrawerStack,
  Pill,
  FormField,
  FormLabel,
  EndpointItem,
  ParameterEditor,
  QueryParametersEditor,
  RequestBodyEditor,
  ResponseBodyEditor,
  GenerateModal    // ADD THIS
} from '$lib/components';
```

After the inline field creation section (around line 259, before `</script>`), add:

```typescript
// ============================================================================
// Code Generation Modal
// ============================================================================

let generateModalOpen = $state(false);
```

**Step 2: Add the Generate Code button**

In the header right side section (around line 322-337), add the Generate Code button before "Add Endpoint":

```svelte
<!-- Right side -->
<div class="flex items-center space-x-2">
  <button
    onclick={() => generateModalOpen = true}
    class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
  >
    <i class="fa-solid fa-code"></i>
    <span>Generate Code</span>
  </button>
  <button
    onclick={apiState.handleAddEndpoint}
    class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md flex items-center space-x-2 hover:bg-mono-50 cursor-pointer transition-colors"
  >
    <i class="fa-solid fa-plus"></i>
    <span>Add Endpoint</span>
  </button>
  <button
    onclick={apiState.openEditDrawer}
    class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md flex items-center space-x-2 hover:bg-mono-50 cursor-pointer transition-colors"
  >
    <i class="fa-solid fa-pen-to-square"></i>
    <span>Edit API</span>
  </button>
</div>
```

Note: The "Generate Code" button becomes the primary (filled) button, and "Add Endpoint" becomes secondary (outlined) since code generation is the main action on this page.

**Step 3: Render the GenerateModal**

Add just before the closing `{/if}` at the end of the template (before the `<style>` block), after the `<DrawerStack>`:

```svelte
<!-- Generate Code Modal -->
<GenerateModal
  open={generateModalOpen}
  apiId={apiId}
  apiTitle={apiState.api?.title ?? 'api'}
  onClose={() => generateModalOpen = false}
/>
```

**Step 4: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 5: Commit**

```
feat(apis): wire Generate Code button into API detail page
```

---

### Task 6: Run all tests and verify

**Step 1: Run unit tests**

Run: `bunx vitest run`
Expected: ALL PASS

**Step 2: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 3: Run smoke tests**

Run: `bunx playwright test --project=smoke`
Expected: ALL PASS

**Step 4: Run E2E CRUD tests**

Run: `PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
Expected: ALL PASS

**Step 5: Fix any failures**

If any tests fail, debug and fix before proceeding.

**Step 6: Commit if any fixes were needed**

---

### Task 7: Clean up plan files

**Step 1: Delete plan files**

```bash
rm docs/plans/2026-03-06-code-generation-modal-design.md
rm docs/plans/2026-03-06-code-generation-modal.md
```

**Step 2: Commit**

```
chore: remove completed code generation plan files
```
