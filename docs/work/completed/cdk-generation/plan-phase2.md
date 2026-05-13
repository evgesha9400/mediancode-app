# CDK Generation — Phase 2: API + Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire CDK generation options (enabled + compute) through the backend REST API and surface them in the frontend `GenerateModal` so users can toggle CDK and choose Lambda vs ECS when downloading code.

**Architecture:** `GenerateOptions` gains `cdkEnabled` and `cdkCompute`; `_convert_to_input_api` populates `InputCdkConfig`; the Svelte modal gets a CDK toggle with a compute radio group.

**Tech Stack:** Python 3.13, Pydantic v2, FastAPI, SvelteKit 5 (Svelte runes), TypeScript.

**Prerequisite:** Phase 1 complete — `InputCdkConfig`, `CdkCompute` exist in `api_craft`.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/api/schemas/api.py` (backend) | Add `cdk_enabled`, `cdk_compute` to `GenerateOptions` |
| Modify | `src/api/services/generation.py` (backend) | Pass CDK options to `InputCdkConfig` in `_convert_to_input_api` |
| Modify | `src/lib/api/apis.ts` (frontend) | Add CDK fields to `GenerateOptions` interface |
| Modify | `src/lib/components/api-generator/GenerateModal.svelte` (frontend) | CDK toggle + compute radio in the UI |

**All backend paths** relative to `mediancode-backend/`.
**All frontend paths** relative to `mediancode-frontend/`.

---

## Task 1: Backend — extend GenerateOptions schema

**Files:**
- Modify: `src/api/schemas/api.py`
- Test: `tests/codegen/test_input_and_transform.py` (add `TestGenerateOptionsCdk` class)

- [ ] **Step 1.1: Write the failing tests**

Add this class to `tests/codegen/test_input_and_transform.py` (after `TestCdkConfig`):

```python
class TestGenerateOptionsCdk:
    def test_cdk_disabled_by_default(self):
        opts = GenerateOptions()
        assert opts.cdk_enabled is False

    def test_cdk_compute_default_is_lambda(self):
        opts = GenerateOptions()
        assert opts.cdk_compute == "lambda"

    def test_cdk_enabled_via_camel_alias(self):
        opts = GenerateOptions.model_validate({"cdkEnabled": True})
        assert opts.cdk_enabled is True

    def test_cdk_compute_via_camel_alias(self):
        opts = GenerateOptions.model_validate({"cdkCompute": "ecs"})
        assert opts.cdk_compute == "ecs"
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd mediancode-backend
poetry run pytest tests/codegen/test_input_and_transform.py::TestGenerateOptionsCdk -v
```
Expected: `AttributeError` — `GenerateOptions` has no `cdk_enabled` attribute.

- [ ] **Step 1.3: Update `GenerateOptions` in `schemas/api.py`**

Add the import at the top of `src/api/schemas/api.py`:

```python
from api_craft.models.enums import CdkCompute
```

Replace the current `GenerateOptions` class with:

```python
class GenerateOptions(BaseModel):
    """Options for code generation passed to POST /v1/apis/{api_id}/generate.

    :ivar healthcheck: Path for the healthcheck endpoint (None to disable).
    :ivar response_placeholders: Generate placeholder response bodies.
    :ivar database_enabled: Generate database support (SQLAlchemy, Alembic, Docker Compose).
    :ivar cdk_enabled: Generate CDK infrastructure files.
    :ivar cdk_compute: Compute platform for CDK — 'lambda' or 'ecs'.
    """

    healthcheck: str | None = Field(default="/health")
    response_placeholders: bool = Field(default=True, alias="responsePlaceholders")
    database_enabled: bool = Field(default=False, alias="databaseEnabled")
    cdk_enabled: bool = Field(default=False, alias="cdkEnabled")
    cdk_compute: CdkCompute = Field(default="lambda", alias="cdkCompute")

    model_config = ConfigDict(populate_by_name=True)
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
poetry run pytest tests/codegen/test_input_and_transform.py::TestGenerateOptionsCdk -v
```
Expected: all 4 tests PASS.

- [ ] **Step 1.5: Commit**

```bash
git add src/api/schemas/api.py tests/codegen/test_input_and_transform.py
git commit -m "feat(api): add cdk_enabled and cdk_compute to GenerateOptions schema"
```

---

## Task 2: Backend — wire CDK options through the generation service

**Files:**
- Modify: `src/api/services/generation.py`
- Test: `tests/codegen/test_input_and_transform.py` (add `TestGenerationServiceCdkWiring` class)

- [ ] **Step 2.1: Write the failing test**

Add this import to the existing import block at the top of `tests/codegen/test_input_and_transform.py`:

```python
from api.services.generation import _convert_to_input_api
```

Then add the class:

```python
class TestGenerationServiceCdkWiring:
    """Verify that GenerateOptions CDK fields reach InputCdkConfig."""

    def _minimal_api_model(self):
        """Return a minimal ApiModel stub sufficient for _convert_to_input_api."""
        from unittest.mock import MagicMock

        api = MagicMock()
        api.title = "ShopApi"
        api.version = "1.0.0"
        api.description = "Test"
        api.namespace_id = "00000000-0000-0000-0000-000000000001"
        api.endpoints = []
        return api

    def test_cdk_disabled_passes_through(self):
        opts = GenerateOptions(cdk_enabled=False)
        result = _convert_to_input_api(self._minimal_api_model(), {}, {}, opts)
        assert result.config.cdk.enabled is False

    def test_cdk_enabled_lambda_passes_through(self):
        opts = GenerateOptions(cdk_enabled=True, cdk_compute="lambda")
        result = _convert_to_input_api(self._minimal_api_model(), {}, {}, opts)
        assert result.config.cdk.enabled is True
        assert result.config.cdk.compute == "lambda"

    def test_cdk_ecs_passes_through(self):
        opts = GenerateOptions(cdk_enabled=True, cdk_compute="ecs")
        result = _convert_to_input_api(self._minimal_api_model(), {}, {}, opts)
        assert result.config.cdk.compute == "ecs"
```

- [ ] **Step 2.2: Run tests to confirm they fail**

```bash
poetry run pytest tests/codegen/test_input_and_transform.py::TestGenerationServiceCdkWiring -v
```
Expected: FAIL — `_convert_to_input_api` does not pass CDK options yet.

- [ ] **Step 2.3: Update `_convert_to_input_api` in `generation.py`**

Add `InputCdkConfig` to the `from api_craft.models.input import (...)` block at the top of `src/api/services/generation.py`:

```python
from api_craft.models.input import (
    ...
    InputCdkConfig,   # add this line
    ...
)
```

In `_convert_to_input_api`, update the `config=` argument in the `return InputAPI(...)` call:

```python
config=InputApiConfig(
    healthcheck=options.healthcheck,
    response_placeholders=options.response_placeholders,
    database=InputDatabaseConfig(
        enabled=options.database_enabled,
    ),
    cdk=InputCdkConfig(
        enabled=options.cdk_enabled,
        compute=options.cdk_compute,
    ),
),
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
poetry run pytest tests/codegen/test_input_and_transform.py::TestGenerationServiceCdkWiring -v
```
Expected: all 3 tests PASS.

- [ ] **Step 2.5: Run full backend test suite**

```bash
poetry run pytest tests/ -v --ignore=tests/http --ignore=tests/runtime -q
```
Expected: all tests PASS.

- [ ] **Step 2.6: Commit**

```bash
git add src/api/services/generation.py tests/codegen/test_input_and_transform.py
git commit -m "feat(api): wire CDK generation options through to InputCdkConfig"
```

---

## Task 3: Frontend — update GenerateOptions type

**Files:**
- Modify: `src/lib/api/apis.ts`

- [ ] **Step 3.1: Update `GenerateOptions` interface in `apis.ts`**

In `mediancode-frontend/src/lib/api/apis.ts`, replace the existing `GenerateOptions` interface:

```typescript
/**
 * Options for code generation
 */
export interface GenerateOptions {
	healthcheck?: string | null;
	responsePlaceholders?: boolean;
	databaseEnabled?: boolean;
	cdkEnabled?: boolean;
	cdkCompute?: 'lambda' | 'ecs';
}
```

No other changes needed — `generateApi` already spreads the `options` object as the request body.

- [ ] **Step 3.2: Verify TypeScript compiles**

```bash
cd mediancode-frontend
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3.3: Commit**

```bash
git add src/lib/api/apis.ts
git commit -m "feat(frontend): add CDK option types to GenerateOptions interface"
```

---

## Task 4: Frontend — CDK section in GenerateModal

**Files:**
- Modify: `src/lib/components/api-generator/GenerateModal.svelte`

- [ ] **Step 4.1: Add CDK state variables to the `<script>` block**

In `GenerateModal.svelte`, add these state variables after `let databaseEnabled = $state(false);`:

```typescript
// CDK options
let cdkEnabled = $state(false);
let cdkCompute = $state<'lambda' | 'ecs'>('lambda');
```

- [ ] **Step 4.2: Pass CDK options into `generateApi` call**

Inside `handleGenerate`, update the `generateApi` call to include CDK options:

```typescript
const { blob, filename } = await generateApi(apiId, {
  healthcheck,
  responsePlaceholders,
  databaseEnabled,
  cdkEnabled,
  cdkCompute
});
```

- [ ] **Step 4.3: Add CDK section to the template**

In the template, add the CDK section after the `<!-- Database support -->` block and before the closing `</div>` of the options section:

```svelte
<!-- CDK infrastructure -->
<div>
  <label class="flex items-center space-x-2 cursor-pointer">
    <input type="checkbox" bind:checked={cdkEnabled}
      class="w-4 h-4 text-green-400 border-mono-600 rounded focus:ring-2 focus:ring-green-400 bg-mono-900" />
    <span class="text-xs text-mono-300">CDK infrastructure</span>
    <span class="text-xs text-mono-400">AWS CDK stack files</span>
  </label>

  {#if cdkEnabled}
    <div class="mt-2 ml-6">
      <p class="text-xs text-mono-400 mb-1">Compute</p>
      <div class="flex space-x-3">
        <label class="flex items-center space-x-1.5 cursor-pointer">
          <input type="radio" bind:group={cdkCompute} value="lambda"
            class="w-3.5 h-3.5 text-green-400 border-mono-600 bg-mono-900 focus:ring-green-400" />
          <span class="text-xs text-mono-300">Lambda</span>
        </label>
        <label class="flex items-center space-x-1.5 cursor-pointer">
          <input type="radio" bind:group={cdkCompute} value="ecs"
            class="w-3.5 h-3.5 text-green-400 border-mono-600 bg-mono-900 focus:ring-green-400" />
          <span class="text-xs text-mono-300">ECS Fargate</span>
        </label>
      </div>
    </div>
  {/if}
</div>
```

- [ ] **Step 4.4: Verify the frontend builds without errors**

```bash
cd mediancode-frontend
npm run build
```
Expected: build completes with no errors.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/components/api-generator/GenerateModal.svelte
git commit -m "feat(frontend): add CDK infrastructure toggle and compute option to GenerateModal"
```

---

## Self-Review Checklist

- [x] Spec coverage: schema, service wiring, TS type, UI — all 4 layers covered
- [x] Only 2 CDK options: `cdkEnabled` (bool) + `cdkCompute` ('lambda' | 'ecs') — no VPC
- [x] `CdkCompute` imported from `api_craft.models.enums` in `schemas/api.py` ✓
- [x] `InputCdkConfig` added to the import in `generation.py` ✓
- [x] Frontend UI is minimal: checkbox + radio group — no dropdown, no invalid states
- [x] No placeholders in any step ✓
- [x] Type consistency: `CdkCompute = 'lambda' | 'ecs'` matches across enums, schema, TS, and UI ✓
