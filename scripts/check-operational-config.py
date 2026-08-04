#!/usr/bin/env python3
"""Verify that operational configuration sources match the public contract."""

from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "config" / "operational-settings.json"
DOC_PATH = ROOT / "docs" / "operations" / "CONFIGURATION.md"


def fail(message: str) -> None:
    print(f"configuration contract error: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_contract() -> dict[str, object]:
    with CONTRACT_PATH.open(encoding="utf-8") as contract_file:
        return json.load(contract_file)


def backend_settings() -> set[str]:
    tree = ast.parse((ROOT / "backend" / "src" / "api" / "settings.py").read_text())
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == "Settings":
            return {
                statement.target.id.upper()
                for statement in node.body
                if isinstance(statement, ast.AnnAssign)
                and isinstance(statement.target, ast.Name)
            }
    fail("backend Settings class not found")
    return set()


def frontend_public_runtime() -> set[str]:
    names: set[str] = set()
    for path in (ROOT / "frontend" / "src").rglob("*"):
        if not path.is_file() or path.suffix not in {".js", ".ts", ".svelte"}:
            continue
        names.update(re.findall(r"\bPUBLIC_[A-Z][A-Z0-9_]*\b", path.read_text()))
    return names


def workflow_references(kind: str) -> set[str]:
    names: set[str] = set()
    pattern = re.compile(rf"\b{kind}\.([A-Z][A-Z0-9_]*)")
    for path in (ROOT / ".github" / "workflows").glob("*.yml"):
        names.update(pattern.findall(path.read_text()))
    return names


def example_keys(relative_path: str) -> set[str]:
    pattern = re.compile(r"^([A-Z][A-Z0-9_]*)=", re.MULTILINE)
    return set(pattern.findall((ROOT / relative_path).read_text()))


def compare(label: str, actual: set[str], expected: object) -> None:
    expected_set = set(expected)
    missing = sorted(expected_set - actual)
    unexpected = sorted(actual - expected_set)
    if missing or unexpected:
        fail(f"{label}: missing={missing}, unexpected={unexpected}")


def main() -> None:
    contract = load_contract()
    if contract.get("schema_version") != 1:
        fail("unsupported schema_version")

    settings = contract.get("settings")
    checks = contract.get("checks")
    if not isinstance(settings, dict) or not isinstance(checks, dict):
        fail("settings and checks must be objects")

    referenced_names: set[str] = set()
    for check_name, values in checks.items():
        if check_name == "example_files":
            if not isinstance(values, dict):
                fail("example_files must be an object")
            for path, names in values.items():
                referenced_names.update(names)
                compare(f"example {path}", example_keys(path), names)
        else:
            referenced_names.update(values)

    undeclared = sorted(referenced_names - settings.keys())
    if undeclared:
        fail(f"checked names absent from settings registry: {undeclared}")

    allowed_classifications = {
        "automatic-secret",
        "destructive-configuration",
        "non-secret",
        "non-secret-path",
        "public-client-configuration",
        "public-configuration",
        "secret",
        "sensitive",
        "test-only",
    }
    for name, definition in settings.items():
        if not isinstance(definition, dict):
            fail(f"{name} definition must be an object")
        if definition.get("classification") not in allowed_classifications:
            fail(f"{name} has invalid classification")
        if any(key in definition for key in ("value", "default_value", "secret_value")):
            fail(f"{name} must not contain a value")

    compare("backend Settings", backend_settings(), checks["backend_settings"])
    compare(
        "frontend public runtime",
        frontend_public_runtime(),
        checks["frontend_public_runtime"],
    )
    compare(
        "GitHub workflow secrets",
        workflow_references("secrets"),
        checks["workflow_secrets"],
    )
    compare(
        "GitHub workflow variables",
        workflow_references("vars"),
        checks["workflow_variables"],
    )

    documentation = DOC_PATH.read_text()
    undocumented = sorted(
        name for name in settings if f"`{name}`" not in documentation
    )
    if undocumented:
        fail(f"settings absent from CONFIGURATION.md: {undocumented}")

    print(
        "operational configuration contract valid: "
        f"{len(settings)} settings, {len(checks['example_files'])} examples"
    )


if __name__ == "__main__":
    main()
