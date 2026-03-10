<script module lang="ts">
  export interface ObjectFormContentProps {
    editedItem: import('$lib/stores/objects').ObjectDefinition;
    mode: 'creating' | 'editing';
    namespaceName: string;
    availableFields: import('$lib/stores/fields').Field[];
    modelValidatorTemplates: import('$lib/types').ModelValidatorTemplate[];
    visibleErrors: Record<string, string>;
    onCreateNewField?: () => void;
  }
</script>

<script lang="ts">
  import type { ObjectDefinition } from '$lib/stores/objects';
  import type { Field } from '$lib/stores/fields';
  import { getFieldById } from '$lib/stores/fields';
  import type { ModelValidatorTemplate, InlineModelValidator } from '$lib/types';
  import {
    FormField,
    FormLabel,
    FieldSelectorDropdown,
    TemplateGallery,
    TemplateForm,
    Pill
  } from '$lib/components';
  import { getModelValidatorTemplateById } from '$lib/stores/modelValidatorTemplates';

  let {
    editedItem = $bindable(),
    mode,
    namespaceName,
    availableFields,
    modelValidatorTemplates,
    visibleErrors,
    onCreateNewField
  }: ObjectFormContentProps = $props();

  // Derive selected field IDs for the FieldSelectorDropdown
  let selectedFieldIds = $derived(editedItem.fields.map(f => f.fieldId));

  // Resolve object's fields to full Field objects for template role dropdowns
  let objectFieldDefinitions = $derived.by((): Field[] => {
    return editedItem.fields
      .map(ref => getFieldById(ref.fieldId))
      .filter((f): f is Field => f !== undefined);
  });

  // --- Field helpers ---
  function addField(fieldId: string) {
    editedItem = {
      ...editedItem,
      fields: [...editedItem.fields, { fieldId, optional: false }]
    };
  }

  function removeField(fieldId: string) {
    editedItem = {
      ...editedItem,
      fields: editedItem.fields.filter(f => f.fieldId !== fieldId)
    };
  }

  function toggleFieldOptional(fieldId: string) {
    const newFields = editedItem.fields.map(f =>
      f.fieldId === fieldId ? { ...f, optional: !f.optional } : f
    );
    editedItem = { ...editedItem, fields: newFields };
  }

  // --- Validator template UI state (local to this component) ---
  let validatorGalleryOpen = $state(false);
  let selectedModelTemplate = $state<ModelValidatorTemplate | null>(null);

  function openValidatorGallery() {
    selectedModelTemplate = null;
    validatorGalleryOpen = true;
  }

  function handleSelectModelTemplate(template: ModelValidatorTemplate) {
    selectedModelTemplate = template;
  }

  function handleAddValidator(validator: { templateId: string; parameters?: Record<string, string>; fieldMappings?: Record<string, string> }) {
    const newValidator: InlineModelValidator = {
      id: '',
      templateId: validator.templateId,
      parameters: validator.parameters ?? null,
      fieldMappings: validator.fieldMappings ?? {}
    };
    editedItem = {
      ...editedItem,
      validators: [...editedItem.validators, newValidator]
    };
    validatorGalleryOpen = false;
    selectedModelTemplate = null;
  }

  function removeValidator(index: number) {
    editedItem = {
      ...editedItem,
      validators: editedItem.validators.filter((_, i) => i !== index)
    };
  }
</script>

<div class="space-y-4">
  <!-- Namespace (Read-only) -->
  <div>
    <FormLabel label="Namespace" forId="object-namespace" />
    <input
      id="object-namespace"
      type="text"
      value={namespaceName}
      disabled
      class="w-full px-3 py-2 border border-mono-700 rounded-lg bg-mono-800 text-mono-400 cursor-not-allowed"
    />
    <p class="mt-1 text-xs text-mono-400">
      Namespace is determined by the selector above
    </p>
  </div>

  <!-- Object Name -->
  <FormField
    id="object-name"
    label="Object Name"
    bind:value={editedItem.name}
    required
    error={visibleErrors.name}
  />

  <!-- Description -->
  <div>
    <FormLabel label="Description" forId="object-description" />
    <textarea
      id="object-description"
      bind:value={editedItem.description}
      rows="3"
      class="w-full px-3 py-2 border border-mono-600 rounded-md bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent"
    ></textarea>
  </div>

  <!-- Fields -->
  <div>
    <h3 class="text-sm text-mono-300 mb-2 font-medium">Fields ({editedItem.fields.length})</h3>

    <div class="space-y-2">
      <!-- Field Selector Dropdown -->
      <FieldSelectorDropdown
        {availableFields}
        {selectedFieldIds}
        onSelect={addField}
        onCreateNew={onCreateNewField}
        placeholder="Add field to object..."
      />

      <!-- Selected Fields -->
      {#if editedItem.fields.length === 0}
        <div class="p-3 bg-mono-800 rounded border border-mono-700">
          <p class="text-xs text-mono-400">No fields selected</p>
        </div>
      {:else}
        <div class="p-2 bg-mono-800 rounded border border-mono-700 space-y-2">
          {#each editedItem.fields as fieldRef}
            {@const field = getFieldById(fieldRef.fieldId)}
            {#if field}
              <div class="flex items-center space-x-2 p-2 bg-mono-900 rounded border border-mono-700">
                <!-- Field Name and Type -->
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-sm text-mono-300">{field.name}</span>
                  <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">{field.type}</span>
                </div>

                <!-- Description (if available) -->
                {#if field.description}
                  <div class="flex-1 text-xs text-mono-400">
                    {field.description}
                  </div>
                {:else}
                  <div class="flex-1"></div>
                {/if}

                <!-- Optional Checkbox -->
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldRef.optional}
                    onchange={() => toggleFieldOptional(fieldRef.fieldId)}
                    class="h-4 w-4 border-mono-600 rounded text-green-400 focus:ring-2 focus:ring-green-400"
                  />
                  <span class="text-sm text-mono-400 whitespace-nowrap">Optional</span>
                </label>

                <!-- Delete Button -->
                <button
                  type="button"
                  onclick={() => removeField(fieldRef.fieldId)}
                  class="text-red-700 hover:text-red-600 transition-colors"
                  title="Remove field"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            {:else}
              <!-- Missing field fallback -->
              <div class="flex items-center gap-2 py-1.5">
                <i class="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>
                <span class="flex-1 text-sm text-red-700">
                  Field not found <span class="font-mono text-xs text-red-500">({fieldRef.fieldId})</span>
                </span>
                <button
                  type="button"
                  onclick={() => removeField(fieldRef.fieldId)}
                  class="p-1 text-red-700 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="Remove missing field reference"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Validators -->
  <div>
    <h3 class="text-sm text-mono-300 mb-2 font-medium">Validators ({editedItem.validators.length})</h3>

    <div class="space-y-2">
      {#if !validatorGalleryOpen}
        <button
          type="button"
          onclick={openValidatorGallery}
          class="w-full px-3 py-2 border border-dashed border-mono-600 rounded-md text-sm text-mono-400 hover:border-mono-500 hover:text-mono-300 transition-colors cursor-pointer"
        >
          <i class="fa-solid fa-plus mr-1"></i> Add Validator
        </button>
      {:else if selectedModelTemplate}
        <div class="p-3 bg-mono-800 rounded border border-mono-700">
          <TemplateForm
            kind="model"
            modelTemplate={selectedModelTemplate}
            availableFields={objectFieldDefinitions}
            onAdd={handleAddValidator}
            onBack={() => selectedModelTemplate = null}
          />
        </div>
      {:else}
        <div class="p-3 bg-mono-800 rounded border border-mono-700">
          <TemplateGallery
            kind="model"
            modelTemplates={modelValidatorTemplates}
            onSelectModel={handleSelectModelTemplate}
            onClose={() => validatorGalleryOpen = false}
          />
        </div>
      {/if}

      {#if editedItem.validators.length > 0}
        <div class="p-2 bg-mono-800 rounded border border-mono-700 space-y-2">
          {#each editedItem.validators as validator, index}
            {@const tmpl = getModelValidatorTemplateById(validator.templateId)}
            <div class="flex items-center space-x-2 p-2 bg-mono-900 rounded border border-mono-700">
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <span class="text-sm text-mono-300 truncate">{tmpl?.name ?? validator.templateId}</span>
                <Pill class="shrink-0">{tmpl?.mode ?? 'after'}</Pill>
              </div>
              <button
                type="button"
                onclick={() => removeValidator(index)}
                class="text-red-700 hover:text-red-600 transition-colors shrink-0"
                title="Remove validator"
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
      <div class="space-y-2">
        {#each editedItem.usedInApis as api}
          <div class="flex items-center justify-between p-3 bg-mono-800 rounded-md">
            <div class="flex items-center space-x-2">
              <i class="fa-solid fa-code text-mono-400"></i>
              <span class="text-sm text-mono-100">{api}</span>
            </div>
          </div>
        {/each}
        {#if editedItem.usedInApis.length === 0}
          <p class="text-sm text-mono-400 italic">Not used in any APIs</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
