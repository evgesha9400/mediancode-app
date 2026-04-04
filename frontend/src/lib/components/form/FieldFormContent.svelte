<script module lang="ts">
  export interface FieldFormContentProps {
    editedItem: import('$lib/stores/fields').Field;
    mode: 'creating' | 'editing';
    selectableTypes: import('$lib/stores/types').FieldType[];
    fieldConstraintDefinitions: import('$lib/stores/fieldConstraints').FieldConstraint[];
    fieldValidatorTemplates: import('$lib/types').FieldValidatorTemplate[];
    visibleErrors: Record<string, string>;
    onTypeChange?: (typeName: string) => void;
    onContainerChange?: (container: string | null) => void;
  }
</script>

<script lang="ts">
  import type { Field, FieldConstraintValue } from '$lib/stores/fields';
  import type { FieldType } from '$lib/stores/types';
  import type { FieldConstraint } from '$lib/stores/fieldConstraints';
  import type { FieldValidatorTemplate, InlineFieldValidator } from '$lib/types';
  import { CONTAINER_VALUES } from '$lib/types';
  import {
    FormField,
    FormLabel,
    TypeSelectorDropdown,
    TemplateGallery,
    TemplateForm,
    FieldConstraintEditor,
    DefaultValueInput,
    Pill
  } from '$lib/components';
  import { apisStore } from '$lib/stores/apis';
  import { goto } from '$app/navigation';
  import { getFieldValidatorTemplateById } from '$lib/stores/fieldValidatorTemplates';
  import {
    drawerLinkedEntityRow,
    inlineRemoveIconButton,
    segmentFieldActive,
    segmentFieldBase,
    segmentFieldBaseJoin,
    segmentFieldInactive,
    surfaceInsideFrostedPanel,
    textareaInsideFrostedPanel,
  } from '$lib/ui/classes';

  let {
    editedItem = $bindable(),
    mode,
    selectableTypes,
    fieldConstraintDefinitions,
    fieldValidatorTemplates,
    visibleErrors,
    onTypeChange,
    onContainerChange
  }: FieldFormContentProps = $props();

  // Filter field constraints by field's type compatibility
  let availableFieldConstraints = $derived(
    fieldConstraintDefinitions.filter(fc => fc.compatibleTypes.includes(editedItem.type))
  );

  // Derive selected field constraint names
  let selectedFieldConstraintNames = $derived(editedItem.constraints.map(v => v.name));

  // Templates compatible with the current field's type
  let compatibleTemplates = $derived(
    fieldValidatorTemplates.filter(t => t.compatibleTypes.includes(editedItem.type))
  );

  // --- Validator template UI state (local to this component) ---
  let validatorGalleryOpen = $state(false);
  let selectedFieldTemplate = $state<FieldValidatorTemplate | null>(null);

  function openValidatorGallery() {
    selectedFieldTemplate = null;
    validatorGalleryOpen = true;
  }

  function handleSelectFieldTemplate(template: FieldValidatorTemplate) {
    selectedFieldTemplate = template;
  }

  function handleAddValidator(validator: { templateId: string; parameters?: Record<string, string> }) {
    const newValidator: InlineFieldValidator = {
      id: '',
      templateId: validator.templateId,
      parameters: validator.parameters ?? null
    };
    editedItem = {
      ...editedItem,
      validators: [...editedItem.validators, newValidator]
    };
    validatorGalleryOpen = false;
    selectedFieldTemplate = null;
  }

  function removeValidator(index: number) {
    editedItem = {
      ...editedItem,
      validators: editedItem.validators.filter((_, i) => i !== index)
    };
  }

  // --- Constraint helpers ---
  function addFieldConstraint(constraintName: string) {
    const constraint = fieldConstraintDefinitions.find(fc => fc.name === constraintName);
    if (!constraint) return;
    editedItem = {
      ...editedItem,
      constraints: [...editedItem.constraints, { name: constraintName, constraintId: constraint.id, value: null }]
    };
  }

  function removeFieldConstraint(index: number) {
    editedItem = {
      ...editedItem,
      constraints: editedItem.constraints.filter((_, i) => i !== index)
    };
  }

  function updateConstraintParam(index: number, rawValue: string, parameterTypes: string[]) {
    const updatedConstraints = editedItem.constraints.map((c, i) => {
      if (i !== index) return c;
      return { ...c, value: rawValue === '' ? null : rawValue };
    });
    editedItem = { ...editedItem, constraints: updatedConstraints };
  }

  function formatFieldConstraintPill(constraintValue: FieldConstraintValue): string {
    if (constraintValue.value !== null) {
      return `${constraintValue.name}: ${constraintValue.value}`;
    }
    return constraintValue.name;
  }

  function handleTypeChangeInternal(newType: string) {
    if (onTypeChange) {
      onTypeChange(newType);
    } else {
      editedItem = { ...editedItem, type: newType, constraints: [], defaultValue: '' };
    }
  }

  function handleContainerChangeInternal(container: string | null) {
    if (onContainerChange) {
      onContainerChange(container);
    } else {
      editedItem = { ...editedItem, container, constraints: [], defaultValue: '' };
    }
  }
</script>

<div class="space-y-4">
  <!-- Field Name -->
  <FormField
    id="fields-name"
    label="Field Name"
    bind:value={editedItem.name}
    required
    error={visibleErrors.name}
  />

  <!-- Container + Type -->
  <div class="flex gap-4">
    <div class="shrink-0">
      <FormLabel label="Container" />
      <div class="flex">
        <button
          type="button"
          onclick={() => handleContainerChangeInternal(null)}
          class="{segmentFieldBase} {editedItem.container === null ? segmentFieldActive : segmentFieldInactive}"
        >
          None
        </button>
        <button
          type="button"
          onclick={() => handleContainerChangeInternal(CONTAINER_VALUES[0])}
          class="{segmentFieldBaseJoin} {editedItem.container === CONTAINER_VALUES[0] ? segmentFieldActive : segmentFieldInactive}"
        >
          List
        </button>
      </div>
    </div>
    <div class="flex-1 min-w-0">
      <FormLabel label="Type" forId="fields-type" required />
      <TypeSelectorDropdown
        id="fields-type"
        availableTypes={selectableTypes}
        selectedTypeName={editedItem.type}
        onSelect={handleTypeChangeInternal}
        placeholder="Search types..."
        error={!!visibleErrors.type}
      />
      {#if visibleErrors.type}
        <p class="text-xs text-red-500 mt-1">{visibleErrors.type}</p>
      {/if}
    </div>
  </div>

  <!-- Description -->
  <div>
    <FormLabel label="Description" forId="fields-description" />
    <textarea
      id="fields-description"
      bind:value={editedItem.description}
      rows="3"
      class={textareaInsideFrostedPanel}
    ></textarea>
  </div>

  <!-- Default Value -->
  <div>
    <FormLabel label="Default Value" forId="fields-default-value" />
    <DefaultValueInput
      id="fields-default-value"
      fieldType={editedItem.type}
      value={editedItem.defaultValue ?? ''}
      onChange={(v) => { editedItem = { ...editedItem, defaultValue: v }; }}
    />
    {#if visibleErrors.defaultValue}
      <p class="text-xs text-red-500 mt-1">{visibleErrors.defaultValue}</p>
    {/if}
  </div>

  <!-- Constraints -->
  <FieldConstraintEditor
    constraints={editedItem.constraints}
    availableConstraints={availableFieldConstraints}
    allConstraintMeta={fieldConstraintDefinitions}
    selectedNames={selectedFieldConstraintNames}
    onAdd={addFieldConstraint}
    onRemove={removeFieldConstraint}
    onParamChange={updateConstraintParam}
    error={visibleErrors.constraints}
  />

  <!-- Validators -->
  <div>
    <h3 class="text-sm text-mono-300 mb-2 font-medium">Validators ({editedItem.validators.length})</h3>

    <div class="space-y-2">
      {#if !validatorGalleryOpen}
        <button
          type="button"
          onclick={openValidatorGallery}
          class="w-full px-3 py-2 rounded-xl border border-dashed border-mono-600 text-sm text-mono-400 hover:border-mono-500 hover:bg-mono-800 hover:text-mono-300 transition-colors cursor-pointer"
        >
          <i class="fa-solid fa-plus mr-1"></i> Add Validator
        </button>
      {:else if selectedFieldTemplate}
        <div class="p-3 {surfaceInsideFrostedPanel}">
          <TemplateForm
            kind="field"
            fieldTemplate={selectedFieldTemplate}
            onAdd={handleAddValidator}
            onBack={() => selectedFieldTemplate = null}
          />
        </div>
      {:else}
        <div class="p-3 {surfaceInsideFrostedPanel}">
          <TemplateGallery
            kind="field"
            fieldTemplates={compatibleTemplates}
            onSelectField={handleSelectFieldTemplate}
            onClose={() => validatorGalleryOpen = false}
          />
        </div>
      {/if}

      {#if editedItem.validators.length > 0}
        <div class="p-2 {surfaceInsideFrostedPanel} space-y-2">
          {#each editedItem.validators as validator, index}
            {@const tmpl = getFieldValidatorTemplateById(validator.templateId)}
            <div class="flex items-center space-x-2 p-3 {surfaceInsideFrostedPanel}">
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <span class="text-sm text-mono-300 truncate">{tmpl?.name ?? validator.templateId}</span>
                <Pill class="shrink-0">{tmpl?.mode ?? 'after'}</Pill>
              </div>
              <button
                type="button"
                onclick={() => removeValidator(index)}
                class={inlineRemoveIconButton}
                title="Remove validator"
                aria-label="Remove validator"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Used In APIs (only when editing) -->
  {#if mode === 'editing'}
    <div>
      <h3 class="text-sm text-mono-300 mb-2 font-medium">Used In APIs ({editedItem.usedInApis.length})</h3>
      <div class="space-y-1">
        {#each editedItem.usedInApis as apiId}
          {@const api = $apisStore.find(a => a.id === apiId)}
          <button
            type="button"
            onclick={() => goto(`/apis/${apiId}`)}
            class={drawerLinkedEntityRow}
          >
            <i class="fa-solid fa-code text-mono-400 text-xs"></i>
            <span class="text-sm text-mono-100">{api?.title ?? apiId}</span>
            {#if api?.version}
              <span class="text-xs text-mono-500">{api.version}</span>
            {/if}
            <div class="flex-1"></div>
            <i class="fa-solid fa-arrow-right text-mono-600 text-xs"></i>
          </button>
        {/each}
        {#if editedItem.usedInApis.length === 0}
          <p class="text-sm text-mono-400 italic">Not used in any APIs</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
