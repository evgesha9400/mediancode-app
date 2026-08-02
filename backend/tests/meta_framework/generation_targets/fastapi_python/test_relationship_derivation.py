"""Tests for portable Relationship Derivation facts."""

from uuid import uuid4

import pytest

from meta_framework.generation_targets.fastapi_python.models.input import (
    InputField,
    InputModel,
    InputRelationship,
)
from meta_framework.generation_targets.fastapi_python.relationship_derivation import (
    derive_input_model_relationships,
    derive_relationship,
    relationship_derivations_for_target,
)

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    (
        "kind",
        "reference_owner",
        "source_cardinality",
        "target_cardinality",
        "target_side",
    ),
    [
        ("one_to_many", "target", "many", "one", "many"),
        ("one_to_one", "target", "one", "one", "target"),
        ("many_to_many", "association", "many", "many", "many"),
    ],
)
def test_derive_relationship_returns_portable_facts(
    kind,
    reference_owner,
    source_cardinality,
    target_cardinality,
    target_side,
):
    """Derive semantics without concrete target artifact names."""
    source_id = uuid4()
    target_id = uuid4()

    derivation = derive_relationship(
        source_object_name="Customer",
        target_object_name="Order",
        source_member_name="orders",
        target_member_name="customer",
        kind=kind,
        required=True,
        source_object_id=source_id,
        target_object_id=target_id,
    )

    assert derivation.source_object_name == "Customer"
    assert derivation.target_object_name == "Order"
    assert derivation.source_member_name == "orders"
    assert derivation.target_member_name == "customer"
    assert derivation.kind == kind
    assert derivation.reference_owner == reference_owner
    assert derivation.source_field_cardinality == source_cardinality
    assert derivation.target_field_cardinality == target_cardinality
    assert derivation.target_object_side == target_side
    assert derivation.required is True
    assert derivation.source_object_id == source_id
    assert derivation.target_object_id == target_id


def test_derive_relationship_rejects_unknown_kind():
    """Reject unknown relationship kinds at the derivation seam."""
    with pytest.raises(ValueError, match="Unknown relationship kind"):
        derive_relationship(
            source_object_name="Customer",
            target_object_name="Order",
            source_member_name="orders",
            target_member_name="customer",
            kind="unknown",
            required=True,
        )


def test_derive_input_model_relationships_preserves_input_order():
    """Derive relationships from InputModel objects in model order."""
    models = [
        InputModel(
            name="Customer",
            fields=[InputField(name="id", type="uuid", pk=True)],
            relationships=[
                InputRelationship(
                    name="orders",
                    target_model="Order",
                    kind="one_to_many",
                    inverse_name="customer",
                )
            ],
        ),
        InputModel(
            name="Order",
            fields=[InputField(name="id", type="uuid", pk=True)],
            relationships=[
                InputRelationship(
                    name="lines",
                    target_model="OrderLine",
                    kind="one_to_many",
                    inverse_name="order",
                )
            ],
        ),
    ]

    derivations = derive_input_model_relationships(models)

    assert [derivation.source_member_name for derivation in derivations] == [
        "orders",
        "lines",
    ]


def test_relationship_derivations_for_target_returns_incoming_derivations():
    """Find all portable derivations targeting one Object."""
    models = [
        InputModel(
            name="Customer",
            fields=[InputField(name="id", type="uuid", pk=True)],
            relationships=[
                InputRelationship(
                    name="orders",
                    target_model="Order",
                    kind="one_to_many",
                    inverse_name="customer",
                )
            ],
        ),
        InputModel(
            name="Store",
            fields=[InputField(name="id", type="uuid", pk=True)],
            relationships=[
                InputRelationship(
                    name="orders",
                    target_model="Order",
                    kind="one_to_many",
                    inverse_name="store",
                )
            ],
        ),
    ]

    derivations = relationship_derivations_for_target("Order", models)

    assert [derivation.target_member_name for derivation in derivations] == [
        "customer",
        "store",
    ]
