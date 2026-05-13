# CDK Generation — Phase 1: api_craft + Tests

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the `api_craft` package so that when CDK is enabled, the generated project includes `infra/platform/` (always `platform-new`) and `infra/app/` (selected by compute + database options).

**Architecture:** Add `InputCdkConfig` (enabled + compute) to the input model. Bundle 5 CDK template directories as static files. `APIGenerator.write_files()` always writes `platform-new` and selects one of 4 app templates. `cdk.json` is the only file rendered dynamically — all stack files are verbatim copies.

**Tech Stack:** Python 3.13, Pydantic v2, `api_craft.main.APIGenerator`, pytest.

---

## Simplified Decision Matrix

Every generated project gets `platform-new`. The app template is selected by 2 user options:

| Compute | Database | App Template |
|---------|----------|--------------|
| Lambda | No | `app-lambda` |
| Lambda | Yes | `app-lambda-db` |
| ECS | No | `app-ecs` |
| ECS | Yes | `app-ecs-db` |

- No VPC option — always new VPC
- No invalid combinations — all 4 are valid
- `app-lambda-novpc` and `platform-existing` are not used

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/api_craft/models/enums.py` | Add `CdkCompute` literal |
| Modify | `src/api_craft/models/input.py` | Add `InputCdkConfig`; add `cdk` field to `InputApiConfig` |
| Create | `src/api_craft/templates/static/cdk/platform-new/` | Static CDK stack files |
| Create | `src/api_craft/templates/static/cdk/app-lambda/` | Static CDK stack files |
| Create | `src/api_craft/templates/static/cdk/app-lambda-db/` | Static CDK stack files |
| Create | `src/api_craft/templates/static/cdk/app-ecs/` | Static CDK stack files |
| Create | `src/api_craft/templates/static/cdk/app-ecs-db/` | Static CDK stack files |
| Modify | `src/api_craft/main.py` | Add `_select_app_template`, `_write_cdk_template`, `_write_cdk_files`; call from `write_files` |
| Create | `tests/codegen/test_cdk_generation.py` | All CDK generation tests |

**All paths are relative to** `mediancode-backend/`.

---

## Task 1: CDK config types in enums + input models

**Files:**
- Modify: `src/api_craft/models/enums.py`
- Modify: `src/api_craft/models/input.py`
- Test: `tests/codegen/test_input_and_transform.py` (add `TestCdkConfig` class)

- [ ] **Step 1.1: Write failing tests for CDK config**

Add this class to `tests/codegen/test_input_and_transform.py` (after `TestDatabaseConfig`):

```python
class TestCdkConfig:
    def test_cdk_disabled_by_default(self):
        config = InputApiConfig()
        assert config.cdk.enabled is False

    def test_cdk_defaults(self):
        config = InputCdkConfig()
        assert config.compute == "lambda"

    def test_cdk_enabled_lambda(self):
        config = InputCdkConfig(enabled=True, compute="lambda")
        assert config.enabled is True

    def test_cdk_enabled_ecs(self):
        config = InputCdkConfig(enabled=True, compute="ecs")
        assert config.enabled is True
```

Also add `InputCdkConfig` to the existing `from api_craft.models.input import (...)` block at the top of that file.

- [ ] **Step 1.2: Run tests to see them fail**

```bash
cd mediancode-backend
poetry run pytest tests/codegen/test_input_and_transform.py::TestCdkConfig -v
```
Expected: `ImportError` — `InputCdkConfig` does not exist yet.

- [ ] **Step 1.3: Add `CdkCompute` to enums.py**

In `src/api_craft/models/enums.py`, add after `GeneratedStrategy`:

```python
CdkCompute = Literal["lambda", "ecs"]
```

- [ ] **Step 1.4: Add `InputCdkConfig` to input.py**

Add `CdkCompute` to the `from api_craft.models.enums import (...)` block:

```python
from api_craft.models.enums import (
    CdkCompute,        # add
    FieldExposure,
    ...
)
```

Add `InputCdkConfig` just before `InputDatabaseConfig`:

```python
class InputCdkConfig(BaseModel):
    """CDK infrastructure generation configuration.

    :ivar enabled: Whether to generate CDK infrastructure files.
    :ivar compute: Compute platform — 'lambda' or 'ecs'.
    """

    enabled: bool = False
    compute: CdkCompute = "lambda"
```

Update `InputApiConfig` to add the `cdk` field:

```python
class InputApiConfig(BaseModel):
    """Configuration flags for the generated API.

    :ivar healthcheck: Optional path used to expose a healthcheck route.
    :ivar response_placeholders: Toggle for generating placeholder response bodies.
    :ivar database: Database configuration for the generated API.
    :ivar cdk: CDK infrastructure generation configuration.
    """

    healthcheck: str | None = None
    response_placeholders: bool = True
    database: InputDatabaseConfig = InputDatabaseConfig()
    cdk: InputCdkConfig = InputCdkConfig()
```

- [ ] **Step 1.5: Run tests to verify they pass**

```bash
poetry run pytest tests/codegen/test_input_and_transform.py::TestCdkConfig -v
```
Expected: all 4 tests PASS.

- [ ] **Step 1.6: Commit**

```bash
git add src/api_craft/models/enums.py src/api_craft/models/input.py tests/codegen/test_input_and_transform.py
git commit -m "feat(generation): add InputCdkConfig model with compute option"
```

---

## Task 2: Bundle static CDK template files

**Files:**
- Create: `src/api_craft/templates/static/cdk/platform-new/` (5 files)
- Create: `src/api_craft/templates/static/cdk/app-lambda/` (5 files)
- Create: `src/api_craft/templates/static/cdk/app-lambda-db/` (6 files)
- Create: `src/api_craft/templates/static/cdk/app-ecs/` (5 files)
- Create: `src/api_craft/templates/static/cdk/app-ecs-db/` (6 files)

Source files live in `/Users/evgesha/Desktop/shop-api/infra/cdk/templates/`. Copy verbatim; do not edit.

- [ ] **Step 2.1: Copy the 5 CDK template directories**

Run from `mediancode-backend/`:

```bash
SHOP_TEMPLATES=/Users/evgesha/Desktop/shop-api/infra/cdk/templates
CDK_STATIC=src/api_craft/templates/static/cdk

for tpl in platform-new app-lambda app-lambda-db app-ecs app-ecs-db; do
    rsync -a --exclude='__pycache__' --exclude='cdk.out' --exclude='cdk.context.json' \
        "$SHOP_TEMPLATES/$tpl/" "$CDK_STATIC/$tpl/"
done
```

- [ ] **Step 2.2: Verify the directory structure**

```bash
find src/api_craft/templates/static/cdk -name "*.py" | sort
```

Expected output (23 files):
```
src/api_craft/templates/static/cdk/app-ecs-db/app.py
src/api_craft/templates/static/cdk/app-ecs-db/stacks/__init__.py
src/api_craft/templates/static/cdk/app-ecs-db/stacks/compute.py
src/api_craft/templates/static/cdk/app-ecs-db/stacks/database.py
src/api_craft/templates/static/cdk/app-ecs/app.py
src/api_craft/templates/static/cdk/app-ecs/stacks/__init__.py
src/api_craft/templates/static/cdk/app-ecs/stacks/compute.py
src/api_craft/templates/static/cdk/app-lambda-db/app.py
src/api_craft/templates/static/cdk/app-lambda-db/stacks/__init__.py
src/api_craft/templates/static/cdk/app-lambda-db/stacks/compute.py
src/api_craft/templates/static/cdk/app-lambda-db/stacks/database.py
src/api_craft/templates/static/cdk/app-lambda/app.py
src/api_craft/templates/static/cdk/app-lambda/stacks/__init__.py
src/api_craft/templates/static/cdk/app-lambda/stacks/compute.py
src/api_craft/templates/static/cdk/platform-new/app.py
src/api_craft/templates/static/cdk/platform-new/stacks/__init__.py
src/api_craft/templates/static/cdk/platform-new/stacks/network.py
```

Also verify `requirements.txt` files:
```bash
find src/api_craft/templates/static/cdk -name "requirements.txt" | wc -l
```
Expected: `5` (one per template directory).

- [ ] **Step 2.3: Commit**

```bash
git add src/api_craft/templates/static/cdk/
git commit -m "feat(generation): bundle 5 CDK static template files (platform + 4 app variants)"
```

---

## Task 3: CDK generation logic in APIGenerator

**Files:**
- Modify: `src/api_craft/main.py`
- Create: `tests/codegen/test_cdk_generation.py`

- [ ] **Step 3.1: Write the failing tests**

Create `tests/codegen/test_cdk_generation.py`:

```python
# tests/codegen/test_cdk_generation.py
"""Tests for CDK infrastructure file generation."""

import json
from pathlib import Path

import pytest

from api_craft.main import APIGenerator
from api_craft.models.input import (
    InputAPI,
    InputApiConfig,
    InputCdkConfig,
    InputDatabaseConfig,
    InputEndpoint,
)

pytestmark = pytest.mark.codegen

_MINIMAL_ENDPOINT = InputEndpoint(name="GetHealth", path="/health", method="GET")


def _make_api(cdk_config: InputCdkConfig, db_enabled: bool = False) -> InputAPI:
    return InputAPI(
        name="ShopApi",
        endpoints=[_MINIMAL_ENDPOINT],
        config=InputApiConfig(
            cdk=cdk_config,
            database=InputDatabaseConfig(enabled=db_enabled),
        ),
    )


# ---------------------------------------------------------------------------
# No CDK by default
# ---------------------------------------------------------------------------


class TestNoCdkByDefault:
    def test_no_infra_directory(self, tmp_path: Path):
        api = _make_api(InputCdkConfig())  # enabled=False
        APIGenerator().generate(api, path=str(tmp_path))
        assert not (tmp_path / "shop-api" / "infra").exists()


# ---------------------------------------------------------------------------
# Fixtures — one per combination
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def lambda_project(tmp_path_factory: pytest.TempPathFactory) -> Path:
    tmp = tmp_path_factory.mktemp("lambda_no_db")
    api = _make_api(InputCdkConfig(enabled=True, compute="lambda"))
    APIGenerator().generate(api, path=str(tmp))
    return tmp / "shop-api"


@pytest.fixture(scope="module")
def lambda_db_project(tmp_path_factory: pytest.TempPathFactory) -> Path:
    tmp = tmp_path_factory.mktemp("lambda_db")
    api = _make_api(InputCdkConfig(enabled=True, compute="lambda"), db_enabled=True)
    APIGenerator().generate(api, path=str(tmp))
    return tmp / "shop-api"


@pytest.fixture(scope="module")
def ecs_project(tmp_path_factory: pytest.TempPathFactory) -> Path:
    tmp = tmp_path_factory.mktemp("ecs_no_db")
    api = _make_api(InputCdkConfig(enabled=True, compute="ecs"))
    APIGenerator().generate(api, path=str(tmp))
    return tmp / "shop-api"


@pytest.fixture(scope="module")
def ecs_db_project(tmp_path_factory: pytest.TempPathFactory) -> Path:
    tmp = tmp_path_factory.mktemp("ecs_db")
    api = _make_api(InputCdkConfig(enabled=True, compute="ecs"), db_enabled=True)
    APIGenerator().generate(api, path=str(tmp))
    return tmp / "shop-api"


# ---------------------------------------------------------------------------
# Common structure — platform always present
# ---------------------------------------------------------------------------


class TestPlatformAlwaysPresent:
    @pytest.mark.parametrize("fixture_name", [
        "lambda_project", "lambda_db_project", "ecs_project", "ecs_db_project"
    ])
    def test_platform_directory_exists(self, fixture_name: str, request):
        project = request.getfixturevalue(fixture_name)
        assert (project / "infra" / "platform").exists()

    @pytest.mark.parametrize("fixture_name", [
        "lambda_project", "lambda_db_project", "ecs_project", "ecs_db_project"
    ])
    def test_platform_network_stack_exists(self, fixture_name: str, request):
        project = request.getfixturevalue(fixture_name)
        assert (project / "infra" / "platform" / "stacks" / "network.py").exists()

    @pytest.mark.parametrize("fixture_name", [
        "lambda_project", "lambda_db_project", "ecs_project", "ecs_db_project"
    ])
    def test_platform_creates_new_vpc(self, fixture_name: str, request):
        project = request.getfixturevalue(fixture_name)
        content = (project / "infra" / "platform" / "stacks" / "network.py").read_text()
        assert "ec2.Vpc(" in content


# ---------------------------------------------------------------------------
# cdk.json
# ---------------------------------------------------------------------------


class TestCdkJson:
    @pytest.mark.parametrize("subdir", ["platform", "app"])
    def test_cdk_json_has_correct_project_name(self, lambda_project: Path, subdir: str):
        data = json.loads((lambda_project / "infra" / subdir / "cdk.json").read_text())
        assert data["context"]["project"] == "shop-api"

    def test_cdk_json_has_app_entry(self, lambda_project: Path):
        data = json.loads((lambda_project / "infra" / "app" / "cdk.json").read_text())
        assert data["app"] == "python3 app.py"


# ---------------------------------------------------------------------------
# Lambda (no DB)
# ---------------------------------------------------------------------------


class TestLambdaNoDb:
    def test_app_directory_exists(self, lambda_project: Path):
        assert (lambda_project / "infra" / "app").exists()

    def test_compute_stack_exists(self, lambda_project: Path):
        assert (lambda_project / "infra" / "app" / "stacks" / "compute.py").exists()

    def test_no_database_stack(self, lambda_project: Path):
        assert not (lambda_project / "infra" / "app" / "stacks" / "database.py").exists()

    def test_compute_uses_lambda(self, lambda_project: Path):
        content = (lambda_project / "infra" / "app" / "stacks" / "compute.py").read_text()
        assert "lambda_.Function(" in content

    def test_requirements_txt_exists(self, lambda_project: Path):
        assert (lambda_project / "infra" / "app" / "requirements.txt").exists()


# ---------------------------------------------------------------------------
# Lambda + DB
# ---------------------------------------------------------------------------


class TestLambdaDb:
    def test_database_stack_exists(self, lambda_db_project: Path):
        assert (lambda_db_project / "infra" / "app" / "stacks" / "database.py").exists()

    def test_compute_stack_exists(self, lambda_db_project: Path):
        assert (lambda_db_project / "infra" / "app" / "stacks" / "compute.py").exists()

    def test_database_stack_has_rds(self, lambda_db_project: Path):
        content = (lambda_db_project / "infra" / "app" / "stacks" / "database.py").read_text()
        assert "rds.DatabaseInstance(" in content

    def test_compute_uses_lambda(self, lambda_db_project: Path):
        content = (lambda_db_project / "infra" / "app" / "stacks" / "compute.py").read_text()
        assert "lambda_.Function(" in content


# ---------------------------------------------------------------------------
# ECS (no DB)
# ---------------------------------------------------------------------------


class TestEcsNoDb:
    def test_compute_stack_uses_fargate(self, ecs_project: Path):
        content = (ecs_project / "infra" / "app" / "stacks" / "compute.py").read_text()
        assert "ApplicationLoadBalancedFargateService" in content

    def test_no_database_stack(self, ecs_project: Path):
        assert not (ecs_project / "infra" / "app" / "stacks" / "database.py").exists()


# ---------------------------------------------------------------------------
# ECS + DB
# ---------------------------------------------------------------------------


class TestEcsDb:
    def test_database_stack_exists(self, ecs_db_project: Path):
        assert (ecs_db_project / "infra" / "app" / "stacks" / "database.py").exists()

    def test_compute_stack_uses_fargate(self, ecs_db_project: Path):
        content = (ecs_db_project / "infra" / "app" / "stacks" / "compute.py").read_text()
        assert "ApplicationLoadBalancedFargateService" in content

    def test_database_stack_has_rds(self, ecs_db_project: Path):
        content = (ecs_db_project / "infra" / "app" / "stacks" / "database.py").read_text()
        assert "rds.DatabaseInstance(" in content
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
poetry run pytest tests/codegen/test_cdk_generation.py -v
```
Expected: all tests FAIL — `infra/` directory never created.

- [ ] **Step 3.3: Add CDK generation to `main.py`**

Add the module-level constant after the imports, before the `format_python_files` function:

```python
_CDK_STATIC_DIR = Path(os.path.dirname(__file__)) / "templates" / "static" / "cdk"
```

Add these three methods to the `APIGenerator` class (after `write_files`, before `generate`):

```python
def _select_app_template(self, compute: str, db_enabled: bool) -> str:
    """Select the CDK app template directory name.

    :param compute: Compute type — 'lambda' or 'ecs'.
    :param db_enabled: Whether database support is enabled.
    :returns: App template directory name.
    """
    if compute == "lambda":
        return "app-lambda-db" if db_enabled else "app-lambda"
    return "app-ecs-db" if db_enabled else "app-ecs"

def _write_cdk_template(
    self, template_name: str, dest_dir: Path, project_name: str
) -> None:
    """Copy a static CDK template to dest_dir, rendering cdk.json with the project name.

    Skips __pycache__ and cdk.out directories. All other files are copied verbatim.
    cdk.json is regenerated so the default context.project matches the generated project.

    :param template_name: Directory name under templates/static/cdk/ (e.g. 'app-lambda').
    :param dest_dir: Destination directory path.
    :param project_name: Kebab-case project name (e.g. 'shop-api').
    """
    src = _CDK_STATIC_DIR / template_name
    dest_dir.mkdir(parents=True, exist_ok=True)

    for item in src.rglob("*"):
        rel = item.relative_to(src)
        if any(part in ("__pycache__", "cdk.out") for part in rel.parts):
            continue
        target = dest_dir / rel
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif item.name == "cdk.json":
            continue  # written separately below
        elif item.is_file():
            target.write_text(item.read_text())

    cdk_json_content = (
        '{\n'
        '  "app": "python3 app.py",\n'
        '  "context": {\n'
        '    "env": "dev",\n'
        f'    "project": "{project_name}"\n'
        '  }\n'
        '}\n'
    )
    (dest_dir / "cdk.json").write_text(cdk_json_content)

def _write_cdk_files(self, project_dir: Path, api) -> None:
    """Write CDK infrastructure files into infra/ subdirectory.

    Always writes platform-new. Selects app template by compute + database.

    :param project_dir: Root directory of the generated project.
    :param api: InputAPI with config.cdk populated.
    """
    cdk_config = api.config.cdk
    if not cdk_config.enabled:
        return

    db_enabled = api.config.database.enabled
    app_tpl = self._select_app_template(cdk_config.compute, db_enabled)

    project_name = camel_to_kebab(api.name)
    infra_dir = project_dir / "infra"

    self._write_cdk_template("platform-new", infra_dir / "platform", project_name)
    self._write_cdk_template(app_tpl, infra_dir / "app", project_name)
```

In `write_files`, add a call to `_write_cdk_files` at the end of the try block, after the source file writing loop (after `write_file(file_path, content)` loop ends, before `except Exception`):

```python
# Write CDK infrastructure files (only when enabled)
self._write_cdk_files(Path(project_directory), api)
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
poetry run pytest tests/codegen/test_cdk_generation.py -v
```
Expected: all tests PASS.

- [ ] **Step 3.5: Run full test suite to check nothing broke**

```bash
poetry run pytest tests/codegen/ -v
```
Expected: all existing codegen tests still PASS.

- [ ] **Step 3.6: Commit**

```bash
git add src/api_craft/main.py tests/codegen/test_cdk_generation.py
git commit -m "feat(generation): generate CDK infra files with platform-new + app template by compute/database"
```

---

## Self-Review Checklist

- [x] Spec coverage: all 4 matrix rows tested via fixtures; "no CDK by default" tested
- [x] Platform-always-present verified with parametrized test across all 4 fixtures
- [x] No VPC option — eliminated from model, tests, and template selection
- [x] No placeholders — all code blocks are complete
- [x] Type consistency: `InputCdkConfig` defined in Task 1, referenced in Task 3 ✓
- [x] `_CDK_STATIC_DIR` defined before methods that use it ✓
- [x] `camel_to_kebab` and `Path` already imported in `main.py` ✓
