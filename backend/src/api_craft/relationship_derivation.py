"""Portable Relationship Derivation facts."""

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from api_craft.models.enums import RelationshipKind
from api_craft.models.input import InputModel

RelationshipReferenceOwner = Literal["target", "association"]
RelationshipCardinality = Literal["one", "many"]
DerivedRelationshipSide = Literal["target", "many"]


@dataclass(frozen=True)
class RelationshipDerivation:
    """Portable facts derived from an authored Relationship Member.

    :ivar source_object_name: Object that authors the relationship.
    :ivar target_object_name: Object referenced by the relationship.
    :ivar source_member_name: Relationship Member name on the source Object.
    :ivar target_member_name: Derived member name on the target Object.
    :ivar kind: Authored relationship kind.
    :ivar reference_owner: Which portable side owns the relationship reference.
    :ivar source_field_cardinality: Cardinality exposed by the source member.
    :ivar target_field_cardinality: Cardinality exposed by the target member.
    :ivar target_object_side: Side label for derived relationship responses.
    :ivar required: Whether the target-side reference is required.
    :ivar source_object_id: Optional source Object ID.
    :ivar target_object_id: Optional target Object ID.
    """

    source_object_name: str
    target_object_name: str
    source_member_name: str
    target_member_name: str
    kind: RelationshipKind
    reference_owner: RelationshipReferenceOwner
    source_field_cardinality: RelationshipCardinality
    target_field_cardinality: RelationshipCardinality
    target_object_side: DerivedRelationshipSide
    required: bool
    source_object_id: UUID | None = None
    target_object_id: UUID | None = None


def derive_relationship(
    *,
    source_object_name: str,
    target_object_name: str,
    source_member_name: str,
    target_member_name: str,
    kind: RelationshipKind,
    required: bool,
    source_object_id: UUID | None = None,
    target_object_id: UUID | None = None,
) -> RelationshipDerivation:
    """Derive portable relationship facts from authored relationship data.

    :param source_object_name: Object that authors the relationship.
    :param target_object_name: Object referenced by the relationship.
    :param source_member_name: Relationship Member name on the source Object.
    :param target_member_name: Derived member name on the target Object.
    :param kind: Authored relationship kind.
    :param required: Whether the target-side reference is required.
    :param source_object_id: Optional source Object ID.
    :param target_object_id: Optional target Object ID.
    :returns: Portable relationship derivation facts.
    :raises ValueError: If the relationship kind is unknown.
    """
    if kind == "one_to_many":
        return RelationshipDerivation(
            source_object_name=source_object_name,
            target_object_name=target_object_name,
            source_member_name=source_member_name,
            target_member_name=target_member_name,
            kind=kind,
            reference_owner="target",
            source_field_cardinality="many",
            target_field_cardinality="one",
            target_object_side="many",
            required=required,
            source_object_id=source_object_id,
            target_object_id=target_object_id,
        )
    if kind == "one_to_one":
        return RelationshipDerivation(
            source_object_name=source_object_name,
            target_object_name=target_object_name,
            source_member_name=source_member_name,
            target_member_name=target_member_name,
            kind=kind,
            reference_owner="target",
            source_field_cardinality="one",
            target_field_cardinality="one",
            target_object_side="target",
            required=required,
            source_object_id=source_object_id,
            target_object_id=target_object_id,
        )
    if kind == "many_to_many":
        return RelationshipDerivation(
            source_object_name=source_object_name,
            target_object_name=target_object_name,
            source_member_name=source_member_name,
            target_member_name=target_member_name,
            kind=kind,
            reference_owner="association",
            source_field_cardinality="many",
            target_field_cardinality="many",
            target_object_side="many",
            required=required,
            source_object_id=source_object_id,
            target_object_id=target_object_id,
        )
    raise ValueError(f"Unknown relationship kind: {kind}")


def derive_input_model_relationships(
    input_models: list[InputModel],
) -> list[RelationshipDerivation]:
    """Derive portable relationship facts from InputModel relationships.

    :param input_models: Input models containing authored relationships.
    :returns: Relationship derivations in input model order.
    """
    derivations: list[RelationshipDerivation] = []
    for source_model in input_models:
        for relationship in source_model.relationships:
            derivations.append(
                derive_relationship(
                    source_object_name=str(source_model.name),
                    target_object_name=relationship.target_model,
                    source_member_name=relationship.name,
                    target_member_name=relationship.inverse_name,
                    kind=relationship.kind,
                    required=relationship.required,
                )
            )
    return derivations


def relationship_derivations_for_target(
    target_object_name: str,
    input_models: list[InputModel],
) -> list[RelationshipDerivation]:
    """Return relationship derivations that target one Object.

    :param target_object_name: Target Object name.
    :param input_models: Input models containing authored relationships.
    :returns: Relationship derivations whose target Object matches.
    """
    return [
        derivation
        for derivation in derive_input_model_relationships(input_models)
        if derivation.target_object_name == target_object_name
    ]
