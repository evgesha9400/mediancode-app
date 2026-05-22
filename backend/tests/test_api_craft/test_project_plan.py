# tests/test_api_craft/test_project_plan.py
"""Tests for generated FastAPI project plans."""

import json
from pathlib import Path

import pytest

from api_craft.models.input import (
    InputAPI,
    InputApiConfig,
    InputCdkConfig,
    InputDatabaseConfig,
    InputEndpoint,
    InputField,
    InputModel,
)
from api_craft.project_plan import (
    build_generated_fastapi_project_plan,
    write_generated_fastapi_project_plan,
)

pytestmark = pytest.mark.unit


def _minimal_api(
    cdk_enabled: bool = False,
    compute: str = "lambda",
    db_enabled: bool = False,
) -> InputAPI:
    """Build a minimal API input for project plan tests.

    :param cdk_enabled: Whether CDK files should be planned.
    :param compute: CDK compute target.
    :param db_enabled: Whether database files are enabled.
    :returns: Minimal InputAPI instance.
    """
    return InputAPI(
        name="ShopApi",
        endpoints=[InputEndpoint(name="GetHealth", path="/health", method="GET")],
        objects=[
            InputModel(
                name="Item",
                fields=[
                    InputField(name="id", type="int", pk=True, exposure="read_only")
                ],
            )
        ]
        if db_enabled
        else [],
        config=InputApiConfig(
            cdk=InputCdkConfig(enabled=cdk_enabled, compute=compute),
            database=InputDatabaseConfig(enabled=db_enabled),
        ),
    )


def test_build_generated_fastapi_project_plan_maps_component_paths(tmp_path: Path):
    """Map rendered components to their generated project destinations."""
    rendered_components = {
        "models.py": "models",
        "pyproject.toml": "project",
        "alembic_env.py": "env",
        "initial_migration.py": "migration",
    }

    plan = build_generated_fastapi_project_plan(
        rendered_components,
        _minimal_api(),
        str(tmp_path),
    )

    files = {project_file.relative_path: project_file for project_file in plan.files}
    assert plan.project_name == "shop-api"
    assert plan.project_dir == tmp_path / "shop-api"
    assert Path("src") in plan.directories
    assert Path("migrations") / "versions" in plan.directories
    assert files[Path("src") / "models.py"].content == "models"
    assert files[Path("pyproject.toml")].content == "project"
    assert files[Path("migrations") / "env.py"].content == "env"
    assert files[Path("migrations") / "versions" / "0001_initial.py"].content == (
        "migration"
    )
    assert "Revision ID" in files[Path("migrations") / "script.py.mako"].content


def test_write_generated_fastapi_project_plan_writes_planned_files(tmp_path: Path):
    """Write planned directories and files into the generated project."""
    plan = build_generated_fastapi_project_plan(
        {"main.py": "main", "README.md": "readme"},
        _minimal_api(),
        str(tmp_path),
    )

    write_generated_fastapi_project_plan(plan)

    assert (tmp_path / "shop-api" / "src" / "main.py").read_text() == "main"
    assert (tmp_path / "shop-api" / "README.md").read_text() == "readme"


@pytest.mark.parametrize(
    ("compute", "db_enabled", "expected_app_template"),
    [
        ("lambda", False, "app-lambda"),
        ("lambda", True, "app-lambda-db"),
        ("ecs", False, "app-ecs"),
        ("ecs", True, "app-ecs-db"),
    ],
)
def test_build_generated_fastapi_project_plan_selects_cdk_templates(
    tmp_path: Path,
    compute: str,
    db_enabled: bool,
    expected_app_template: str,
):
    """Select static CDK templates from compute and database settings."""
    cdk_static_dir = tmp_path / "cdk"
    plan = build_generated_fastapi_project_plan(
        {"main.py": "main"},
        _minimal_api(cdk_enabled=True, compute=compute, db_enabled=db_enabled),
        str(tmp_path),
        cdk_static_dir=cdk_static_dir,
    )

    assert [template.source_dir.name for template in plan.static_templates] == [
        "platform-new",
        expected_app_template,
    ]
    assert [template.relative_destination for template in plan.static_templates] == [
        Path("infra") / "platform",
        Path("infra") / "app",
    ]


def test_write_generated_fastapi_project_plan_copies_static_templates(tmp_path: Path):
    """Copy static templates and render generated cdk.json files."""
    cdk_static_dir = tmp_path / "cdk"
    platform_dir = cdk_static_dir / "platform-new"
    app_dir = cdk_static_dir / "app-lambda"
    platform_dir.mkdir(parents=True)
    app_dir.mkdir(parents=True)
    (platform_dir / "network.py").write_text("network")
    (platform_dir / "cdk.json").write_text("stale")
    (app_dir / "compute.py").write_text("compute")
    (app_dir / "cdk.json").write_text("stale")

    plan = build_generated_fastapi_project_plan(
        {"main.py": "main"},
        _minimal_api(cdk_enabled=True),
        str(tmp_path / "out"),
        cdk_static_dir=cdk_static_dir,
    )
    write_generated_fastapi_project_plan(plan)

    platform_output = tmp_path / "out" / "shop-api" / "infra" / "platform"
    app_output = tmp_path / "out" / "shop-api" / "infra" / "app"
    assert (platform_output / "network.py").read_text() == "network"
    assert (app_output / "compute.py").read_text() == "compute"
    assert (
        json.loads((platform_output / "cdk.json").read_text())["context"]["project"]
        == "shop-api"
    )
    assert json.loads((app_output / "cdk.json").read_text())["context"]["project"] == (
        "shop-api"
    )
