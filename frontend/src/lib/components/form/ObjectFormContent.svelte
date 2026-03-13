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
  import type { ModelValidatorTemplate, InlineModelValidator, FieldAppearance, ObjectRelationship, Cardinality } from '$lib/types';
  import {
    FormField,
    FormLabel,
    FieldSelectorDropdown,
    TemplateGallery,
    TemplateForm,
    Pill
  } from '$lib/components';
  import { getModelValidatorTemplateById } from '$lib/stores/modelValidatorTemplates';
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import { showToast } from '$lib/stores/toasts';
  import { generateId } from '$lib/utils/ids';

  const ALLOWED_PK_TYPES = new Set(['int', 'uuid']);

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
      fields: [...editedItem.fields, { fieldId, optional: false, isPk: false, appears: 'both' as const }]
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

  function toggleFieldPk(fieldId: string) {
    const targetRef = editedItem.fields.find(f => f.fieldId === fieldId);
    if (targetRef && !targetRef.isPk) {
      const field = getFieldById(fieldId);
      if (field && !ALLOWED_PK_TYPES.has(field.type)) {
        showToast(
          `Cannot set '${field.name}' as primary key — only int and uuid types are supported`,
          'error'
        );
        return;
      }
    }
    const newFields = editedItem.fields.map(f => {
      if (f.fieldId === fieldId) {
        const newIsPk = !f.isPk;
        return { ...f, isPk: newIsPk, optional: newIsPk ? false : f.optional, appears: newIsPk ? 'response' as const : f.appears };
      }
      return { ...f, isPk: false };
    });
    editedItem = { ...editedItem, fields: newFields };
  }

  function setFieldAppears(fieldId: string, value: FieldAppearance) {
    const fieldRef = editedItem.fields.find(f => f.fieldId === fieldId);
    if (!fieldRef || fieldRef.isPk) return;
    const newFields = editedItem.fields.map(f => {
      if (f.fieldId === fieldId) {
        return { ...f, appears: value, optional: value === 'response' ? false : f.optional };
      }
      return f;
    });
    editedItem = { ...editedItem, fields: newFields };
  }

  function moveFieldUp(index: number) {
    if (index <= 0) return;
    const newFields = [...editedItem.fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    editedItem = { ...editedItem, fields: newFields };
  }

  function moveFieldDown(index: number) {
    if (index >= editedItem.fields.length - 1) return;
    const newFields = [...editedItem.fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    editedItem = { ...editedItem, fields: newFields };
  }

  // --- Relationship helpers ---
  const CARDINALITY_OPTIONS: { value: Cardinality; label: string }[] = [
    { value: 'has_one', label: 'has one' },
    { value: 'has_many', label: 'has many' },
    { value: 'references', label: 'references' },
    { value: 'many_to_many', label: 'many ↔ many' }
  ];

  let relationshipSearch = $state('');
  let relationshipDropdownOpen = $state(false);

  // Filter out self and already-added relationship targets, then apply search
  let filteredTargetObjects = $derived.by(() => {
    const existingTargetIds = new Set((editedItem.relationships || []).map(r => r.targetObjectId));
    const lowerQuery = relationshipSearch.toLowerCase().trim();
    return $objectsStore
      .filter(o => o.id !== editedItem.id && !existingTargetIds.has(o.id))
      .filter(o => {
        if (!lowerQuery) return true;
        return (
          o.name.toLowerCase().includes(lowerQuery) ||
          o.description?.toLowerCase().includes(lowerQuery)
        );
      });
  });

  function addRelationship(targetObjectId: string) {
    const targetObj = getObjectById(targetObjectId);
    if (!targetObj) return;
    const defaultName = targetObj.name.toLowerCase() + 's';
    const newRel: ObjectRelationship = {
      id: generateId('rel'),
      sourceObjectId: editedItem.id,
      targetObjectId,
      name: defaultName,
      cardinality: 'has_many',
      isInferred: false
    };
    editedItem = {
      ...editedItem,
      relationships: [...(editedItem.relationships || []), newRel]
    };
    relationshipSearch = '';
    relationshipDropdownOpen = false;
  }

  function removeRelationship(relId: string) {
    editedItem = {
      ...editedItem,
      relationships: (editedItem.relationships || []).filter(r => r.id !== relId)
    };
  }

  function updateRelationshipName(relId: string, name: string) {
    editedItem = {
      ...editedItem,
      relationships: (editedItem.relationships || []).map(r =>
        r.id === relId ? { ...r, name } : r
      )
    };
  }

  function updateRelationshipCardinality(relId: string, cardinality: Cardinality) {
    editedItem = {
      ...editedItem,
      relationships: (editedItem.relationships || []).map(r => {
        if (r.id !== relId) return r;
        const targetObj = getObjectById(r.targetObjectId);
        const autoName = targetObj
          ? (cardinality === 'has_many' || cardinality === 'many_to_many'
            ? targetObj.name.toLowerCase() + 's'
            : targetObj.name.toLowerCase())
          : r.name;
        return { ...r, cardinality, name: autoName };
      })
    };
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
      class="w-full px-3 py-2 border border-mono-700 bg-mono-800 text-mono-400 cursor-not-allowed"
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
      class="w-full px-3 py-2 border border-mono-600 bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent"
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
          {#each editedItem.fields as fieldRef, index (fieldRef.fieldId)}
            {@const field = getFieldById(fieldRef.fieldId)}
            {@const pkCompatible = field ? ALLOWED_PK_TYPES.has(field.type) : false}
            {#if field}
              <div class="flex items-center space-x-2 p-2 bg-mono-900 rounded border border-mono-700">
                <!-- Reorder Buttons -->
                <div class="flex flex-col -space-y-px">
                  <button
                    type="button"
                    onclick={() => moveFieldUp(index)}
                    disabled={index === 0}
                    class="text-mono-500 hover:text-mono-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-0.5"
                    title="Move field up"
                  >
                    <i class="fa-solid fa-chevron-up text-[10px]"></i>
                  </button>
                  <button
                    type="button"
                    onclick={() => moveFieldDown(index)}
                    disabled={index === editedItem.fields.length - 1}
                    class="text-mono-500 hover:text-mono-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-0.5"
                    title="Move field down"
                  >
                    <i class="fa-solid fa-chevron-down text-[10px]"></i>
                  </button>
                </div>

                <!-- Field Name (fixed width for type alignment) -->
                <span class="font-mono text-sm text-mono-300 w-40 shrink-0 truncate" title={field.name}>{field.name}</span>
                <!-- Field Type (aligned vertically across rows) -->
                <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded shrink-0">{field.type}</span>

                <div class="flex-1"></div>

                <!-- PK Toggle (only shown for int/uuid types) -->
                {#if pkCompatible || fieldRef.isPk}
                  <button
                    type="button"
                    onclick={() => toggleFieldPk(fieldRef.fieldId)}
                    class="flex items-center space-x-1 px-2 py-0.5 text-xs font-medium border transition-colors {fieldRef.isPk
                      ? 'bg-green-900/30 text-green-400 border-green-700'
                      : 'bg-mono-800 text-mono-500 border-mono-700 hover:text-mono-300 hover:border-mono-600'}"
                    title={fieldRef.isPk ? 'Remove primary key' : 'Set as primary key'}
                  >
                    <i class="fa-solid fa-key text-[10px]"></i>
                    <span>PK</span>
                  </button>
                {/if}

                <!-- Appears-in Segmented Control -->
                <div class="flex border border-mono-700 rounded overflow-hidden {fieldRef.isPk ? 'opacity-40 pointer-events-none' : ''}">
                  <button
                    type="button"
                    onclick={() => setFieldAppears(fieldRef.fieldId, 'both')}
                    class="px-2 py-0.5 text-xs font-medium transition-colors {fieldRef.appears === 'both' ? 'bg-blue-500/20 text-blue-400 border-r border-blue-500/50' : 'bg-mono-800 text-mono-500 border-r border-mono-700 hover:text-mono-300'}"
                    title="Include in both request and response"
                  >Both</button>
                  <button
                    type="button"
                    onclick={() => setFieldAppears(fieldRef.fieldId, 'request')}
                    class="px-2 py-0.5 text-xs font-medium transition-colors {fieldRef.appears === 'request' ? 'bg-yellow-500/20 text-yellow-400 border-r border-yellow-500/50' : 'bg-mono-800 text-mono-500 border-r border-mono-700 hover:text-mono-300'}"
                    title="Include in request only"
                  >Req</button>
                  <button
                    type="button"
                    onclick={() => setFieldAppears(fieldRef.fieldId, 'response')}
                    class="px-2 py-0.5 text-xs font-medium transition-colors {fieldRef.appears === 'response' ? 'bg-green-500/20 text-green-400' : 'bg-mono-800 text-mono-500 hover:text-mono-300'}"
                    title="Include in response only"
                  >Res</button>
                </div>

                <!-- Optional Checkbox -->
                <label class="flex items-center space-x-2 {fieldRef.isPk || fieldRef.appears === 'response' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}" title={fieldRef.isPk ? 'Primary key fields cannot be optional' : fieldRef.appears === 'response' ? 'Response-only fields are not optional' : ''}>
                  <input
                    type="checkbox"
                    checked={fieldRef.optional}
                    disabled={fieldRef.isPk || fieldRef.appears === 'response'}
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

  <!-- Relationships -->
  <div>
    <h3 class="text-sm text-mono-300 mb-2 font-medium">Relationships ({(editedItem.relationships || []).length})</h3>

    <div class="space-y-2">
      <!-- Add Relationship Search -->
      <div class="relative">
        <div class="relative">
          <input
            type="text"
            bind:value={relationshipSearch}
            onfocus={() => relationshipDropdownOpen = true}
            onblur={() => setTimeout(() => relationshipDropdownOpen = false, 150)}
            placeholder="Add relationship to object..."
            class="w-full px-3 py-1.5 border border-mono-600 bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm pr-8"
          />
          <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
        </div>

        {#if relationshipDropdownOpen}
          <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-700 shadow-lg shadow-black/30 max-h-60 overflow-auto">
            {#if filteredTargetObjects.length > 0}
              {#each filteredTargetObjects as obj (obj.id)}
                <button
                  type="button"
                  onclick={() => addRelationship(obj.id)}
                  class="w-full px-3 py-2 text-left hover:bg-mono-800 border-b border-mono-700 last:border-b-0 transition-colors"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2">
                        <i class="fa-solid fa-cube text-mono-400 text-xs"></i>
                        <span class="font-mono text-sm text-mono-300">{obj.name}</span>
                        <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">
                          {obj.fields.length} fields
                        </span>
                      </div>
                      {#if obj.description}
                        <p class="text-xs text-mono-400 mt-1">{obj.description}</p>
                      {/if}
                    </div>
                  </div>
                </button>
              {/each}
            {:else if relationshipSearch.trim()}
              <div class="px-3 py-2 text-sm text-mono-400">
                No objects found matching "{relationshipSearch}"
              </div>
            {:else}
              <div class="px-3 py-2 text-sm text-mono-400">
                No objects available. Create other objects first to add relationships.
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Relationship Rows -->
      {#if (editedItem.relationships || []).length > 0}
        <div class="p-2 bg-mono-800 rounded border border-mono-700 space-y-2">
          {#each editedItem.relationships || [] as rel}
            {@const targetObj = getObjectById(rel.targetObjectId)}
            <div class="flex items-center space-x-2 p-2 bg-mono-900 rounded {rel.isInferred ? 'border border-dashed border-mono-600 opacity-60' : 'border border-mono-700'}">
              <!-- Name Input -->
              {#if rel.isInferred}
                <span class="font-mono text-sm text-mono-400 w-32 truncate" title={rel.name}>{rel.name}</span>
              {:else}
                <input
                  type="text"
                  value={rel.name}
                  oninput={(e) => updateRelationshipName(rel.id, (e.target as HTMLInputElement).value)}
                  class="font-mono text-sm text-mono-300 bg-mono-800 border border-mono-700 px-2 py-0.5 rounded w-32 focus:ring-1 focus:ring-green-400 focus:border-transparent"
                />
              {/if}

              <!-- Cardinality Select -->
              {#if rel.isInferred}
                <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">{CARDINALITY_OPTIONS.find(o => o.value === rel.cardinality)?.label ?? rel.cardinality}</span>
              {:else}
                <select
                  value={rel.cardinality}
                  onchange={(e) => updateRelationshipCardinality(rel.id, (e.target as HTMLSelectElement).value as Cardinality)}
                  class="text-xs text-mono-300 bg-mono-800 border border-mono-700 px-2 py-0.5 rounded focus:ring-1 focus:ring-green-400"
                >
                  {#each CARDINALITY_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              {/if}

              <!-- Target Object Badge -->
              <span class="text-xs font-medium px-2 py-0.5 rounded {rel.isInferred ? 'bg-mono-700 text-mono-400' : 'bg-blue-500/20 text-blue-400'}">
                → {targetObj?.name ?? 'Unknown'}
              </span>

              <!-- FK Hint for references -->
              {#if rel.cardinality === 'references' && targetObj}
                <span class="text-xs text-mono-500">
                  FK {rel.name}_id
                </span>
              {/if}

              <div class="flex-1"></div>

              <!-- Remove Button -->
              <button
                type="button"
                onclick={() => removeRelationship(rel.id)}
                class="text-red-700 hover:text-red-600 transition-colors shrink-0"
                title={rel.isInferred ? 'Remove inferred relationship (removes both sides)' : 'Remove relationship'}
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
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
          class="w-full px-3 py-2 border border-dashed border-mono-600 text-sm text-mono-400 hover:border-mono-500 hover:text-mono-300 transition-colors cursor-pointer"
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
          <div class="flex items-center justify-between p-3 bg-mono-800">
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
