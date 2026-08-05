"""Repair endpoint-owned query schema drift.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-05 00:00:00.000000

The endpoint-owned query refactor changed already-published migration files.
Databases that had applied the original revisions therefore retained the
legacy schema while Alembic reported them at head. This forward migration
repairs that drift without changing databases already created from the current
schema.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from meta_framework.generation_targets.fastapi_python.models.enums import (
    FilterOperator,
    check_constraint_sql,
)

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: str | None = "d4e5f6a7b8c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_table(conn: sa.Connection, table_name: str) -> bool:
    return sa.inspect(conn).has_table(table_name)


def _column_names(conn: sa.Connection, table_name: str) -> set[str]:
    return {column["name"] for column in sa.inspect(conn).get_columns(table_name)}


def _constraint_exists(
    conn: sa.Connection, table_name: str, constraint_name: str
) -> bool:
    return bool(
        conn.execute(
            sa.text(
                "SELECT 1 FROM pg_constraint "
                "WHERE conrelid = to_regclass(:table_name) "
                "AND conname = :constraint_name"
            ),
            {
                "table_name": table_name,
                "constraint_name": constraint_name,
            },
        ).scalar()
    )


def _index_exists(conn: sa.Connection, index_name: str) -> bool:
    return bool(
        conn.execute(
            sa.text("SELECT to_regclass(:index_name) IS NOT NULL"),
            {"index_name": index_name},
        ).scalar()
    )


def _rename_constraint_if_present(
    conn: sa.Connection,
    table_name: str,
    old_name: str,
    new_name: str,
) -> None:
    if _constraint_exists(conn, table_name, old_name):
        op.execute(
            sa.text(
                f'ALTER TABLE "{table_name}" '
                f'RENAME CONSTRAINT "{old_name}" TO "{new_name}"'
            )
        )


def _repair_field_member_schema(conn: sa.Connection) -> None:
    has_scalar_members = _has_table(conn, "scalar_members")
    has_field_members = _has_table(conn, "field_members")

    if has_scalar_members and has_field_members:
        raise RuntimeError(
            "Both scalar_members and field_members exist; refusing to guess "
            "which table is authoritative."
        )

    if has_scalar_members:
        op.rename_table("scalar_members", "field_members")

        constraint_suffixes = (
            "pkey",
            "id_fkey",
            "field_id_fkey",
            "id_not_null",
            "field_id_not_null",
            "role_not_null",
            "is_nullable_not_null",
        )
        for suffix in constraint_suffixes:
            _rename_constraint_if_present(
                conn,
                "field_members",
                f"scalar_members_{suffix}",
                f"field_members_{suffix}",
            )

        _rename_constraint_if_present(
            conn,
            "field_members",
            "ck_scalar_members_role",
            "ck_field_members_role",
        )
        if _index_exists(conn, "ix_scalar_members_field_id"):
            op.execute(
                "ALTER INDEX ix_scalar_members_field_id "
                "RENAME TO ix_field_members_field_id"
            )

    if not _has_table(conn, "field_members"):
        raise RuntimeError("field_members is missing after schema repair.")

    discriminator_definition = conn.execute(
        sa.text(
            "SELECT pg_get_constraintdef(oid) FROM pg_constraint "
            "WHERE conrelid = 'object_members'::regclass "
            "AND conname = 'ck_object_members_member_type'"
        )
    ).scalar()
    if discriminator_definition and "scalar" in discriminator_definition:
        op.drop_constraint(
            "ck_object_members_member_type",
            "object_members",
            type_="check",
        )
        conn.execute(
            sa.text(
                "UPDATE object_members SET member_type = 'field' "
                "WHERE member_type = 'scalar'"
            )
        )
        op.create_check_constraint(
            "ck_object_members_member_type",
            "object_members",
            "member_type IN ('field', 'relationship')",
        )


def _create_endpoint_path_params() -> None:
    op.create_table(
        "endpoint_path_params",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("endpoint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("field_member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["endpoint_id"], ["api_endpoints.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["field_member_id"], ["field_members.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "endpoint_id",
            "position",
            name="uq_endpoint_path_params_endpoint_position",
        ),
        sa.UniqueConstraint(
            "endpoint_id",
            "name",
            name="uq_endpoint_path_params_endpoint_name",
        ),
    )
    op.create_index(
        "ix_endpoint_path_params_endpoint_id",
        "endpoint_path_params",
        ["endpoint_id"],
        unique=False,
    )
    op.create_index(
        "ix_endpoint_path_params_field_member_id",
        "endpoint_path_params",
        ["field_member_id"],
        unique=False,
    )


def _create_endpoint_query_params() -> None:
    op.create_table(
        "endpoint_query_params",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("endpoint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("field_member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operator", sa.Text(), nullable=False),
        sa.Column(
            "required", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.ForeignKeyConstraint(
            ["endpoint_id"], ["api_endpoints.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["field_member_id"], ["field_members.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            check_constraint_sql("operator", FilterOperator),
            name="ck_endpoint_query_params_operator",
        ),
        sa.UniqueConstraint(
            "endpoint_id",
            "position",
            name="uq_endpoint_query_params_endpoint_position",
        ),
        sa.UniqueConstraint(
            "endpoint_id",
            "name",
            name="uq_endpoint_query_params_endpoint_name",
        ),
    )
    op.create_index(
        "ix_endpoint_query_params_endpoint_id",
        "endpoint_query_params",
        ["endpoint_id"],
        unique=False,
    )
    op.create_index(
        "ix_endpoint_query_params_field_member_id",
        "endpoint_query_params",
        ["field_member_id"],
        unique=False,
    )


def _repair_endpoint_schema(conn: sa.Connection) -> None:
    columns = _column_names(conn, "api_endpoints")
    legacy_columns = {"path_params", "query_params_object_id", "object_id"}
    current_columns = {"target_object_id", "pagination"}

    if columns & legacy_columns and columns & current_columns:
        raise RuntimeError(
            "api_endpoints contains both legacy and current columns; refusing "
            "a partial schema repair."
        )

    if legacy_columns <= columns:
        endpoint_count = conn.execute(
            sa.text("SELECT count(*) FROM api_endpoints")
        ).scalar_one()
        if endpoint_count:
            raise RuntimeError(
                "Legacy api_endpoints contains rows. The target Object and "
                "parameter mappings require an explicit data migration before "
                "this schema repair can continue."
            )

        for constraint_name in (
            "api_endpoints_query_params_object_id_fkey",
            "api_endpoints_object_id_fkey",
        ):
            if _constraint_exists(conn, "api_endpoints", constraint_name):
                op.drop_constraint(
                    constraint_name,
                    "api_endpoints",
                    type_="foreignkey",
                )

        for column_name in (
            "path_params",
            "query_params_object_id",
            "object_id",
        ):
            op.drop_column("api_endpoints", column_name)

        op.add_column(
            "api_endpoints",
            sa.Column(
                "target_object_id",
                postgresql.UUID(as_uuid=True),
                nullable=False,
            ),
        )
        op.add_column(
            "api_endpoints",
            sa.Column(
                "pagination",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
        op.create_foreign_key(
            "api_endpoints_target_object_id_fkey",
            "api_endpoints",
            "objects",
            ["target_object_id"],
            ["id"],
            ondelete="RESTRICT",
        )
    elif not current_columns <= columns:
        raise RuntimeError(
            "api_endpoints matches neither the legacy nor current schema."
        )

    if not _has_table(conn, "endpoint_path_params"):
        _create_endpoint_path_params()
    if not _has_table(conn, "endpoint_query_params"):
        _create_endpoint_query_params()


def upgrade() -> None:
    conn = op.get_bind()
    _repair_field_member_schema(conn)
    _repair_endpoint_schema(conn)


def downgrade() -> None:
    raise RuntimeError(
        "The schema repair is intentionally forward-only because endpoint "
        "parameter rows cannot be represented safely in the legacy schema."
    )
