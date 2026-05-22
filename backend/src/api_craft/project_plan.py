# src/api_craft/project_plan.py
"""Generated FastAPI project layout planning."""

from dataclasses import dataclass
from pathlib import Path

from api_craft.models.input import InputAPI
from api_craft.utils import camel_to_kebab, create_dir, write_file

_CDK_STATIC_DIR = Path(__file__).parent / "templates" / "static" / "cdk"

_ROOT_FILES = {
    "pyproject.toml",
    "Makefile",
    "Dockerfile",
    "README.md",
    "docker-compose.yml",
    "alembic.ini",
    ".env",
}

_ALEMBIC_SCRIPT_TEMPLATE = (
    '"""${message}\n\n'
    "Revision ID: ${up_revision}\n"
    "Revises: ${down_revision | comma,n}\n"
    "Create Date: ${create_date}\n\n"
    '"""\n'
    "from typing import Sequence, Union\n\n"
    "from alembic import op\n"
    "import sqlalchemy as sa\n\n\n"
    "# revision identifiers, used by Alembic.\n"
    "revision: str = ${repr(up_revision)}\n"
    "down_revision: Union[str, None] = ${repr(down_revision)}\n"
    "branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}\n"
    "depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}\n\n\n"
    "def upgrade() -> None:\n"
    "    ${upgrades if upgrades else 'pass'}\n\n\n"
    "def downgrade() -> None:\n"
    "    ${downgrades if downgrades else 'pass'}\n"
)


@dataclass(frozen=True)
class GeneratedProjectFile:
    """A generated file destination and its content.

    :ivar relative_path: File path relative to the generated FastAPI project root.
    :ivar content: Text content to write.
    """

    relative_path: Path
    content: str

    def path_in(self, project_dir: Path) -> Path:
        """Return the absolute destination path for this file.

        :param project_dir: Generated FastAPI project root directory.
        :returns: Absolute file path.
        """
        return project_dir / self.relative_path


@dataclass(frozen=True)
class GeneratedStaticTemplate:
    """A static template directory copied into the generated FastAPI project.

    :ivar source_dir: Static template source directory.
    :ivar relative_destination: Destination directory relative to the project root.
    """

    source_dir: Path
    relative_destination: Path

    def destination_in(self, project_dir: Path) -> Path:
        """Return the absolute destination path for this template.

        :param project_dir: Generated FastAPI project root directory.
        :returns: Absolute destination directory.
        """
        return project_dir / self.relative_destination


@dataclass(frozen=True)
class GeneratedFastAPIProjectPlan:
    """Filesystem plan for a generated FastAPI project.

    :ivar project_name: Kebab-case generated FastAPI project name.
    :ivar project_dir: Absolute generated FastAPI project root directory.
    :ivar directories: Directories to create, relative to the project root.
    :ivar files: Files to write, relative to the project root.
    :ivar static_templates: Static template directories to copy into the project.
    """

    project_name: str
    project_dir: Path
    directories: tuple[Path, ...]
    files: tuple[GeneratedProjectFile, ...]
    static_templates: tuple[GeneratedStaticTemplate, ...]


def build_generated_fastapi_project_plan(
    rendered_components: dict[str, str],
    api: InputAPI,
    output_path: str,
    cdk_static_dir: Path = _CDK_STATIC_DIR,
) -> GeneratedFastAPIProjectPlan:
    """Build the filesystem plan for a generated FastAPI project.

    :param rendered_components: Mapping of rendered component names to content.
    :param api: Input API being generated.
    :param output_path: Directory where the generated FastAPI project is written.
    :param cdk_static_dir: Root directory for static CDK templates.
    :returns: Generated FastAPI project plan.
    """
    project_name = camel_to_kebab(api.name)
    project_dir = Path(output_path) / project_name
    directories = [Path("src")]
    files: list[GeneratedProjectFile] = []

    if "alembic_env.py" in rendered_components:
        directories.append(Path("migrations") / "versions")
        files.append(
            GeneratedProjectFile(
                relative_path=Path("migrations") / "script.py.mako",
                content=_ALEMBIC_SCRIPT_TEMPLATE,
            )
        )

    for filename, content in rendered_components.items():
        files.append(
            GeneratedProjectFile(
                relative_path=_component_relative_path(filename),
                content=content,
            )
        )

    return GeneratedFastAPIProjectPlan(
        project_name=project_name,
        project_dir=project_dir,
        directories=tuple(directories),
        files=tuple(files),
        static_templates=_build_cdk_static_templates(api, cdk_static_dir),
    )


def write_generated_fastapi_project_plan(plan: GeneratedFastAPIProjectPlan) -> None:
    """Write all directories, files, and static templates in a project plan.

    :param plan: Generated FastAPI project plan to write.
    """
    for directory in plan.directories:
        create_dir(str(plan.project_dir / directory))

    for project_file in plan.files:
        destination = project_file.path_in(plan.project_dir)
        create_dir(str(destination.parent))
        write_file(str(destination), project_file.content)

    for static_template in plan.static_templates:
        _write_static_template(static_template, plan.project_dir, plan.project_name)


def _component_relative_path(filename: str) -> Path:
    """Map a rendered component name to a project-relative file path.

    :param filename: Rendered component name.
    :returns: Destination path relative to the generated FastAPI project root.
    """
    if filename == "alembic_env.py":
        return Path("migrations") / "env.py"
    if filename == "initial_migration.py":
        return Path("migrations") / "versions" / "0001_initial.py"
    if filename in _ROOT_FILES:
        return Path(filename)
    return Path("src") / filename


def _build_cdk_static_templates(
    api: InputAPI, cdk_static_dir: Path
) -> tuple[GeneratedStaticTemplate, ...]:
    """Return static CDK templates required by the API configuration.

    :param api: Input API being generated.
    :param cdk_static_dir: Root directory for static CDK templates.
    :returns: Static template copy plans.
    """
    cdk_config = api.config.cdk
    if not cdk_config.enabled:
        return ()

    app_template = _select_cdk_app_template(
        compute=cdk_config.compute,
        db_enabled=api.config.database.enabled,
    )
    return (
        GeneratedStaticTemplate(
            source_dir=cdk_static_dir / "platform-new",
            relative_destination=Path("infra") / "platform",
        ),
        GeneratedStaticTemplate(
            source_dir=cdk_static_dir / app_template,
            relative_destination=Path("infra") / "app",
        ),
    )


def _select_cdk_app_template(compute: str, db_enabled: bool) -> str:
    """Select the CDK app template directory name.

    :param compute: Compute type, either ``lambda`` or ``ecs``.
    :param db_enabled: Whether database support is enabled.
    :returns: Static app template directory name.
    """
    if compute == "lambda":
        return "app-lambda-db" if db_enabled else "app-lambda"
    return "app-ecs-db" if db_enabled else "app-ecs"


def _write_static_template(
    static_template: GeneratedStaticTemplate,
    project_dir: Path,
    project_name: str,
) -> None:
    """Copy a static template directory into the generated FastAPI project.

    Skips ``__pycache__`` and ``cdk.out`` directories. All files are copied
    verbatim except ``cdk.json``, which is regenerated with the project name.

    :param static_template: Static template copy plan.
    :param project_dir: Generated FastAPI project root directory.
    :param project_name: Kebab-case generated FastAPI project name.
    """
    source_dir = static_template.source_dir
    destination_dir = static_template.destination_in(project_dir)
    destination_dir.mkdir(parents=True, exist_ok=True)

    for item in source_dir.rglob("*"):
        relative_path = item.relative_to(source_dir)
        if any(part in ("__pycache__", "cdk.out") for part in relative_path.parts):
            continue
        if item.name == ".DS_Store":
            continue

        target = destination_dir / relative_path
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif item.name == "cdk.json":
            continue
        elif item.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(item.read_text())

    (destination_dir / "cdk.json").write_text(_render_cdk_json(project_name))


def _render_cdk_json(project_name: str) -> str:
    """Render the static CDK app configuration file.

    :param project_name: Kebab-case generated FastAPI project name.
    :returns: ``cdk.json`` content.
    """
    return (
        "{\n"
        '  "app": "python3 app.py",\n'
        '  "context": {\n'
        '    "env": "dev",\n'
        f'    "project": "{project_name}"\n'
        "  }\n"
        "}\n"
    )
