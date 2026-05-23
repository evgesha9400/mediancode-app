"""Tests for current SQLAlchemy relationship target names."""

import pytest

from api_craft.relationship_derivation import derive_relationship
from api_craft.sqlalchemy_relationships import (
    association_fk_column_name,
    association_table_name,
    foreign_key_field_name,
    object_table_name,
)

pytestmark = pytest.mark.unit


def test_foreign_key_field_name_uses_target_member_name():
    """Name target-owned references from the target member."""
    derivation = derive_relationship(
        source_object_name="Customer",
        target_object_name="Order",
        source_member_name="orders",
        target_member_name="customer",
        kind="one_to_many",
        required=True,
    )

    assert foreign_key_field_name(derivation) == "customer_id"


def test_foreign_key_field_name_skips_association_relationships():
    """Do not create target-side FK names for association relationships."""
    derivation = derive_relationship(
        source_object_name="Post",
        target_object_name="Tag",
        source_member_name="tags",
        target_member_name="posts",
        kind="many_to_many",
        required=False,
    )

    assert foreign_key_field_name(derivation) is None


def test_association_table_name_uses_source_table_and_source_member():
    """Name association tables from source table and source member."""
    derivation = derive_relationship(
        source_object_name="BlogPost",
        target_object_name="Tag",
        source_member_name="tags",
        target_member_name="posts",
        kind="many_to_many",
        required=False,
    )

    assert association_table_name(derivation) == "blog_posts_tags"


def test_association_table_name_skips_target_owned_relationships():
    """Do not create association table names for target-owned references."""
    derivation = derive_relationship(
        source_object_name="Customer",
        target_object_name="Order",
        source_member_name="orders",
        target_member_name="customer",
        kind="one_to_many",
        required=True,
    )

    assert association_table_name(derivation) is None


@pytest.mark.parametrize(
    ("object_name", "table_name"),
    [
        ("BlogPost", "blog_posts"),
        ("Category", "categories"),
        ("Address", "addresses"),
    ],
)
def test_object_table_name_uses_current_pluralization(object_name, table_name):
    """Use the same table names as the current SQLAlchemy target."""
    assert object_table_name(object_name) == table_name


def test_association_fk_column_name_uses_singular_table_name():
    """Name association FK columns from generated table names."""
    assert association_fk_column_name("blog_posts") == "blog_post_id"
