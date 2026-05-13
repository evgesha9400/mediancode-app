"""Contract test: committed api-spec.yaml must match FastAPI's runtime OpenAPI.

The repo-root ``api-spec.yaml`` is the single source of truth consumed by the
frontend for type generation. This test fails when a route, schema, or response
shape changes in the FastAPI code without a corresponding regeneration of the
spec file, preventing silent drift.

Regenerate the spec when this test fails:

    cd backend
    poetry run python -c "import yaml; from api.main import app; \
print(yaml.safe_dump(app.openapi(), sort_keys=False))" > ../api-spec.yaml
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from api.main import app

SPEC_PATH = Path(__file__).resolve().parents[3] / "api-spec.yaml"


@pytest.fixture(scope="module")
def runtime_spec() -> dict:
    return app.openapi()


@pytest.fixture(scope="module")
def committed_spec() -> dict:
    if not SPEC_PATH.is_file():
        pytest.fail(f"api-spec.yaml not found at {SPEC_PATH}")
    with SPEC_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def test_openapi_matches_committed_spec(
    runtime_spec: dict, committed_spec: dict
) -> None:
    if runtime_spec == committed_spec:
        return

    runtime_paths = set(runtime_spec.get("paths", {}))
    committed_paths = set(committed_spec.get("paths", {}))
    added = sorted(runtime_paths - committed_paths)
    removed = sorted(committed_paths - runtime_paths)

    runtime_schemas = set(runtime_spec.get("components", {}).get("schemas", {}))
    committed_schemas = set(committed_spec.get("components", {}).get("schemas", {}))
    added_schemas = sorted(runtime_schemas - committed_schemas)
    removed_schemas = sorted(committed_schemas - runtime_schemas)

    diff_summary_lines = ["api-spec.yaml is stale.", f"  Spec path: {SPEC_PATH}"]
    if added:
        diff_summary_lines.append(f"  Paths added in code, missing in spec: {added}")
    if removed:
        diff_summary_lines.append(f"  Paths in spec, missing in code: {removed}")
    if added_schemas:
        diff_summary_lines.append(
            f"  Schemas added in code, missing in spec: {added_schemas}"
        )
    if removed_schemas:
        diff_summary_lines.append(
            f"  Schemas in spec, missing in code: {removed_schemas}"
        )
    diff_summary_lines.append(
        "  Regenerate with the snippet in this test module's docstring."
    )

    pytest.fail("\n".join(diff_summary_lines))
