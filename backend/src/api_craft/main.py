# api_craft/main.py
"""Main module for API generation.

This module orchestrates transforming a high-level API specification into a
fully scaffolded FastAPI project using Mako templates.
"""

import logging
import os
from pathlib import Path
import subprocess
from typing import Any

from mako.exceptions import TopLevelLookupException
from mako.lookup import TemplateLookup
from mako.template import Template

from api_craft.extractors import (
    collect_association_tables,
    collect_cdk_dependencies,
    collect_database_dependencies,
    collect_model_extra_dependencies,
    collect_model_imports,
    collect_orm_imports,
    collect_path_params_imports,
    collect_query_params_imports,
    extract_path_parameters,
    extract_query_parameters,
)
from api_craft.models.input import InputAPI
from api_craft.prepare import PreparedAPI, indent_body, prepare_api, render_field
from api_craft.project_plan import (
    build_generated_fastapi_project_plan,
    write_generated_fastapi_project_plan,
)

# Configure logging
logging.basicConfig(level="INFO")
logger = logging.getLogger(__name__)


def format_python_files(directory: Path) -> None:
    """Format all Python files in a directory using Ruff.

    :param directory: Path to the directory containing Python files.
    """
    try:
        subprocess.run(
            ["ruff", "format", str(directory)],
            check=True,
            capture_output=True,
            text=True,
        )
        subprocess.run(
            ["ruff", "check", "--fix", str(directory)],
            check=True,
            capture_output=True,
            text=True,
        )
        logger.debug(f"Formatted {directory}")
    except subprocess.CalledProcessError as e:
        logger.warning(f"Could not format {directory}: {e.stderr}")


class APIGenerator:
    """Generate a FastAPI project from an input specification.

    The generator performs the following steps:

    1. Load Mako templates.
    2. Transform input models to template models.
    3. Extract components used by templates.
    4. Render template files.
    5. Write files into the target project structure.
    """

    def __init__(self, template_dir: str | None = None):
        """Initialize the generator.

        :param template_dir: Optional templates directory. If ``None``, the
            default ``templates/`` bundled with this package is used.
        """
        self.template_dir = template_dir or os.path.join(
            os.path.dirname(__file__), "templates"
        )
        self.template_lookup: TemplateLookup | None = None
        self.templates: dict[str, Template] = {}

    def load_templates(self) -> None:
        """Load all required Mako templates.

        :raises FileNotFoundError: If template files are missing.
        """
        try:
            self.template_lookup = TemplateLookup(directories=[self.template_dir])

            # Load all templates up front
            template_files = {
                "models": "models.mako",
                "views": "views.mako",
                "path": "path.mako",
                "query": "query.mako",
                "main": "main.mako",
                "pyproject": "pyproject.mako",
                "makefile": "makefile.mako",
                "dockerfile": "dockerfile.mako",
                "readme": "readme.mako",
                "orm_models": "orm_models.mako",
                "database": "database.mako",
                "docker_compose": "docker_compose.mako",
                "alembic_ini": "alembic_ini.mako",
                "alembic_env": "alembic_env.mako",
                "env": "env.mako",
                "initial_migration": "initial_migration.mako",
            }

            self.templates = {
                key: self.template_lookup.get_template(filename)
                for key, filename in template_files.items()
            }
        except TopLevelLookupException as exc:
            logger.error(f"Failed to load templates: {str(exc)}")
            raise FileNotFoundError("Template files are missing") from exc
        except Exception as e:
            logger.error(f"Failed to load templates: {str(e)}")
            raise

    def transform_api(self, api: InputAPI) -> PreparedAPI:
        """Prepare input API for template rendering.

        :param api: Input API model to prepare.
        :returns: Prepared API ready for template rendering.
        :raises ValueError: If preparation fails.
        """
        try:
            return prepare_api(api)
        except Exception as e:
            logger.error(f"Failed to transform API: {str(e)}")
            raise ValueError("API transformation failed") from e

    def extract_components(self, template_api: PreparedAPI) -> dict[str, Any]:
        """Extract all components from the template API.

        :param template_api: Transformed template API.
        :returns: Mapping of component names to values used by templates.
        :raises ValueError: If component extraction fails.
        """
        try:
            return {
                "models": template_api.models,
                "views": template_api.views,
                "path_params": extract_path_parameters(template_api),
                "query_params": extract_query_parameters(template_api),
                "orm_models": template_api.orm_models,
                "database_config": template_api.database_config,
            }
        except Exception as e:
            logger.error(f"Failed to extract components: {str(e)}")
            raise ValueError("Component extraction failed") from e

    def render_components(
        self, components: dict[str, Any], template_api: PreparedAPI, api: InputAPI
    ) -> dict[str, str]:
        """Render all components using templates.

        :param components: Extracted API components.
        :param template_api: Transformed template API.
        :param api: Original input API.
        :returns: Mapping of filenames to rendered text content.
        :raises ValueError: If rendering fails.
        """
        try:
            model_imports = collect_model_imports(components["models"])
            extra_deps = collect_model_extra_dependencies(components["models"])
            extra_dev_deps: list[str] = []

            database_config = components.get("database_config")
            orm_models = components.get("orm_models", [])

            # Build orm_model_map: response model name -> ORM class name
            # Build orm_pk_map: primary key field name -> ORM class name
            orm_model_map = None
            orm_pk_map = None
            if database_config and orm_models:
                orm_model_map = {m.source_model: m.class_name for m in orm_models}
                # Also map {Name}Response → ORM class for split schema mode
                orm_model_map.update(
                    {f"{m.source_model}Response": m.class_name for m in orm_models}
                )
                orm_pk_map = {
                    f.name: m.class_name
                    for m in orm_models
                    for f in m.fields
                    if f.primary_key
                }
                # Merge database dependencies into extra_deps
                db_deps = collect_database_dependencies()
                extra_deps = sorted(set(extra_deps + db_deps))

            if api.config.cdk.enabled:
                cdk_deps = collect_cdk_dependencies()
                extra_dev_deps = sorted(set(extra_dev_deps + cdk_deps))

            rendered_components = {
                "models.py": self.templates["models"].render(
                    models=components["models"],
                    imports=model_imports,
                    pydantic_imports=template_api.pydantic_imports,
                    render_field=render_field,
                    indent_body=indent_body,
                ),
                "views.py": self.templates["views"].render(
                    views=components["views"],
                    database_config=database_config,
                    orm_model_map=orm_model_map or {},
                    orm_pk_map=orm_pk_map or {},
                    api=template_api,
                ),
                "main.py": self.templates["main"].render(api=template_api),
                "pyproject.toml": self.templates["pyproject"].render(
                    api=template_api,
                    extra_dependencies=extra_deps or [],
                    extra_dev_dependencies=extra_dev_deps or [],
                ),
                "Makefile": self.templates["makefile"].render(api=template_api),
                "Dockerfile": self.templates["dockerfile"].render(api=template_api),
                "README.md": self.templates["readme"].render(api=template_api),
            }

            if components["path_params"]:
                path_imports = collect_path_params_imports(components["path_params"])
                rendered_components["path.py"] = self.templates["path"].render(
                    params=components["path_params"], imports=path_imports
                )

            if components["query_params"]:
                query_imports = collect_query_params_imports(components["query_params"])
                rendered_components["query.py"] = self.templates["query"].render(
                    params=components["query_params"], imports=query_imports
                )

            # Database files (only when database is enabled)
            if database_config and orm_models:
                orm_imports = collect_orm_imports(orm_models)
                assoc_tables = collect_association_tables(orm_models)
                rendered_components["orm_models.py"] = self.templates[
                    "orm_models"
                ].render(
                    orm_models=orm_models,
                    imports=orm_imports,
                    association_tables=assoc_tables or [],
                )
                rendered_components["database.py"] = self.templates["database"].render(
                    api=template_api
                )
                rendered_components["docker-compose.yml"] = self.templates[
                    "docker_compose"
                ].render(api=template_api)
                rendered_components["alembic.ini"] = self.templates[
                    "alembic_ini"
                ].render(api=template_api)
                rendered_components["alembic_env.py"] = self.templates[
                    "alembic_env"
                ].render(api=template_api)
                rendered_components[".env"] = self.templates["env"].render(
                    api=template_api
                )
                rendered_components["initial_migration.py"] = self.templates[
                    "initial_migration"
                ].render(
                    orm_models=orm_models,
                    association_tables=assoc_tables or [],
                )

            return rendered_components
        except Exception as e:
            logger.error(f"Failed to render components: {str(e)}")
            raise ValueError("Component rendering failed") from e

    def generate(
        self, api: InputAPI, path: str | None = None, dry_run: bool = False
    ) -> None:
        """Run the end-to-end generation flow.

        :param api: Input API to generate code for.
        :param path: Optional output directory path.
        :param dry_run: If ``True``, log the rendered content without writing files.
        :raises Exception: If any step fails.
        """
        try:
            logger.info("Starting API generation...")

            # 1. Load templates
            logger.info("Loading templates...")
            self.load_templates()

            # 2. Transform API
            logger.info("Transforming API...")
            template_api = self.transform_api(api)

            # 3. Extract components
            logger.info("Extracting components...")
            components = self.extract_components(template_api)

            # 4. Render components
            logger.info("Rendering components...")
            rendered_components = self.render_components(components, template_api, api)

            # 5. Write files or display dry run
            if not dry_run:
                logger.info("Writing files...")
                output_path = path or os.path.dirname(__file__)
                project_plan = build_generated_fastapi_project_plan(
                    rendered_components, api, output_path
                )
                write_generated_fastapi_project_plan(project_plan)

                # 6. Format generated code
                logger.info("Formatting generated code...")
                format_python_files(project_plan.project_dir)

                logger.info("API generation completed successfully.")
            else:
                logger.info("Dry run enabled. Would generate these files:")
                for filename, content in rendered_components.items():
                    logger.info(f"\n{filename}:\n{content}")
                logger.info("Dry run completed successfully.")

        except Exception as e:
            logger.error(f"API generation failed: {str(e)}")
            raise


def generate_fastapi(
    api: InputAPI, path: str | None = None, dry_run: bool = False
) -> None:
    """Generate FastAPI code from an input specification.

    :param api: Input API specification.
    :param path: Optional output directory path.
    :param dry_run: If ``True``, only log what would be generated.
    :raises Exception: If generation fails.
    """
    generator = APIGenerator()
    generator.generate(api, path, dry_run)
