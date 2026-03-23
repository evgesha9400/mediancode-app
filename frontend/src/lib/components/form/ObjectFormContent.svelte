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
  import type { ModelValidatorTemplate, InlineModelValidator, FieldRole, ObjectFieldReference, ObjectRelationship, Cardinality } from '$lib/types';
  import { ROLE_LABELS, ROLE_TOOLTIPS, getAvailableRoles, roleHasModifiers } from '$lib/types';
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
  import { getFkHint } from '$lib/domain/relationships';
  import { apisStore } from '$lib/stores/apis';
  import { showToast } from '$lib/stores/toasts';
  import { generateId } from '$lib/utils/ids';
  import { goto } from '$app/navigation';
  import { dragHandleZone, dragHandle } from 'svelte-dnd-action';
  import type { DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';

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

  // --- Drag-and-drop field reordering ---
  type DndItem = ObjectFieldReference & { id: string };

  // Mutable state for dndzone — synced from editedItem.fields
  let dndItems: DndItem[] = $state(
    editedItem.fields.map(f => ({ ...f, id: f.fieldId }))
  );

  // Re-sync when editedItem.fields changes externally (undo, field add/remove)
  $effect(() => {
    dndItems = editedItem.fields.map(f => ({ ...f, id: f.fieldId }));
  });

  // Map library items back to clean ObjectFieldReference[] (strip `id` and any library-injected properties)
  function toDomainFields(items: DndItem[]): ObjectFieldReference[] {
    return items.map(item => ({
      fieldId: item.fieldId,
      role: item.role,
      optional: item.optional,
      defaultValue: item.defaultValue,
    }));
  }

  function handleDndConsider(e: CustomEvent<DndEvent<DndItem>>) {
    dndItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<DndItem>>) {
    dndItems = e.detail.items;
    editedItem = { ...editedItem, fields: toDomainFields(e.detail.items) };
  }

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
      fields: [...editedItem.fields, { fieldId, role: 'writable' as const, optional: false }]
    };
  }

  function removeField(fieldId: string) {
    editedItem = {
      ...editedItem,
      fields: editedItem.fields.filter(f => f.fieldId !== fieldId)
    };
  }

  /** Change a field's role — clear modifiers if switching to a non-modifier role */
  function setFieldRole(fieldId: string, role: FieldRole) {
    const newFields = editedItem.fields.map(f => {
      if (f.fieldId !== fieldId) return f;
      const base = { ...f, role };
      if (!roleHasModifiers(role)) {
        // Non-modifier roles: force optional=false, clear defaultValue
        return { ...base, optional: false, defaultValue: null };
      }
      return base;
    });
    // Only one PK allowed — if setting to PK, clear PK on all other fields
    if (role === 'pk') {
      editedItem = {
        ...editedItem,
        fields: newFields.map(f =>
          f.fieldId !== fieldId && f.role === 'pk'
            ? { ...f, role: 'writable' as FieldRole, optional: false }
            : f
        )
      };
    } else {
      editedItem = { ...editedItem, fields: newFields };
    }
  }

  /** Toggle optional for a field (only for modifier roles) */
  function toggleFieldOptional(fieldId: string) {
    const newFields = editedItem.fields.map(f => {
      if (f.fieldId !== fieldId) return f;
      if (!roleHasModifiers(f.role)) return f;
      return { ...f, optional: !f.optional };
    });
    editedItem = { ...editedItem, fields: newFields };
  }

  /** Map a field type name to the appropriate HTML input type for the default value input. */
  function defaultInputType(fieldType: string): { inputType: string; step?: string; isBool: boolean } {
    switch (fieldType) {
      case 'int':      return { inputType: 'number', step: '1', isBool: false };
      case 'float':    return { inputType: 'number', step: 'any', isBool: false };
      case 'bool':     return { inputType: 'text', isBool: true };
      case 'datetime': return { inputType: 'datetime-local', isBool: false };
      case 'date':     return { inputType: 'date', isBool: false };
      case 'time':     return { inputType: 'time', isBool: false };
      case 'EmailStr': return { inputType: 'email', isBool: false };
      default:         return { inputType: 'text', isBool: false }; // str, uuid, etc.
    }
  }

  /** Set literal default value (empty string -> null) */
  function setFieldDefaultValue(fieldId: string, value: string) {
    const newFields = editedItem.fields.map(f => {
      if (f.fieldId !== fieldId) return f;
      return { ...f, defaultValue: value.trim() || null };
    });
    editedItem = { ...editedItem, fields: newFields };
  }

  // --- Relationship helpers ---
  const CARDINALITY_OPTIONS: { value: Cardinality; label: string }[] = [
    { value: 'has_one', label: 'has one' },
    { value: 'has_many', label: 'has many' },
    { value: 'references', label: 'belongs to' },
    { value: 'many_to_many', label: 'many ↔ many' }
  ];

  // IDs of objects already targeted by a relationship (user-defined or inferred)
  let relatedObjectIds = $derived(
    new Set((editedItem.relationships || []).map(r => r.targetObjectId))
  );

  // Objects available as relationship targets (exclude self + already related)
  let availableTargetObjects = $derived(
    $objectsStore.filter(o => o.id !== editedItem.id && !relatedObjectIds.has(o.id))
  );

  let relationshipSearchQuery = $state('');
  let relationshipDropdownOpen = $state(false);

  // Filter available targets by search query
  let filteredTargetObjects = $derived.by(() => {
    const q = relationshipSearchQuery.toLowerCase().trim();
    if (!q) return availableTargetObjects;
    return availableTargetObjects.filter(o => o.name.toLowerCase().includes(q));
  });

  function handleRelationshipFocus(): void {
    relationshipDropdownOpen = true;
  }

  function handleRelationshipBlur(): void {
    setTimeout(() => {
      relationshipDropdownOpen = false;
    }, 150);
  }

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
    relationshipSearchQuery = '';
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
        <div
          use:dragHandleZone={{ items: dndItems, flipDurationMs: 150, type: 'fields' }}
          onconsider={handleDndConsider}
          onfinalize={handleDndFinalize}
          class="p-2 bg-mono-800 rounded border border-mono-700 space-y-2"
        >
          {#each dndItems as item (item.id)}
            {@const field = getFieldById(item.fieldId)}
            {@const availableRoles = field ? getAvailableRoles(field.type) : []}
            <div animate:flip={{ duration: 150 }}>
            {#if field}
              {@const inputCfg = defaultInputType(field.type)}
              {@const modifierClass = roleHasModifiers(item.role) ? '' : 'invisible pointer-events-none'}
              <div class="p-2 bg-mono-900 rounded border border-mono-700 space-y-1.5">
                <div class="flex items-center space-x-2">
                  <!-- Drag Handle -->
                  <div use:dragHandle class="text-mono-600 hover:text-mono-400 cursor-grab">
                    <i class="fa-solid fa-grip-vertical text-xs"></i>
                  </div>

                  <!-- Field Name and Type -->
                  <span class="font-mono text-sm text-mono-300">{field.name}</span>
                  <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">{field.type}</span>

                  <div class="flex-1"></div>

                  <!-- Role Selector -->
                  <select
                    class="w-40 shrink-0 bg-mono-800 border border-mono-700 text-mono-300 text-xs rounded px-1.5 py-0.5 focus:ring-1 focus:ring-green-400 focus:border-transparent"
                    value={item.role}
                    onchange={(e) => setFieldRole(item.fieldId, e.currentTarget.value as FieldRole)}
                    title={ROLE_TOOLTIPS[item.role]}
                  >
                    {#each availableRoles as role}
                      <option value={role}>{ROLE_LABELS[role]}</option>
                    {/each}
                  </select>

                  <!-- Default Value Input — type-aware; always rendered for consistent row width; hidden for non-modifier roles -->
                  {#if inputCfg.isBool}
                    <select
                      class="bg-mono-800 border border-mono-700 text-mono-300 text-xs rounded px-1.5 py-0.5 w-28 shrink-0 focus:ring-1 focus:ring-green-400 focus:border-transparent {modifierClass}"
                      value={item.defaultValue ?? ''}
                      onchange={(e) => setFieldDefaultValue(item.fieldId, e.currentTarget.value)}
                      disabled={!roleHasModifiers(item.role)}
                    >
                      <option value="">— none —</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  {:else}
                    <input
                      type={inputCfg.inputType}
                      step={inputCfg.step}
                      class="bg-mono-800 border border-mono-700 text-mono-300 text-xs rounded px-1.5 py-0.5 w-28 shrink-0 focus:ring-1 focus:ring-green-400 focus:border-transparent {modifierClass}"
                      placeholder="Default value"
                      value={item.defaultValue ?? ''}
                      oninput={(e) => setFieldDefaultValue(item.fieldId, e.currentTarget.value)}
                      disabled={!roleHasModifiers(item.role)}
                    />
                  {/if}

                  <!-- Optional Toggle — always rendered for consistent row width; hidden for non-modifier roles -->
                  <button
                    type="button"
                    onclick={() => toggleFieldOptional(item.fieldId)}
                    disabled={!roleHasModifiers(item.role)}
                    title="Allow null values"
                    class="shrink-0 text-xs px-2 py-0.5 rounded border transition-colors {roleHasModifiers(item.role) ? (item.optional ? 'border-green-500 text-green-400 bg-green-400/10' : 'border-mono-600 text-mono-500 hover:border-mono-500 hover:text-mono-400') : 'invisible pointer-events-none border-mono-600 text-mono-500'}"
                  >
                    optional
                  </button>

                  <!-- Delete Button -->
                  <button
                    type="button"
                    onclick={() => removeField(item.fieldId)}
                    class="text-red-700 hover:text-red-600 transition-colors"
                    title="Remove field"
                  >
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <!-- Inline validation errors -->
                {#if visibleErrors[`field_${item.fieldId}_role`]}
                  <p class="text-xs text-red-400 ml-6">{visibleErrors[`field_${item.fieldId}_role`]}</p>
                {/if}
              </div>
            {:else}
              <!-- Missing field fallback -->
              <div class="flex items-center gap-2 py-1.5">
                <i class="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>
                <span class="flex-1 text-sm text-red-700">
                  Field not found <span class="font-mono text-xs text-red-500">({item.fieldId})</span>
                </span>
                <button
                  type="button"
                  onclick={() => removeField(item.fieldId)}
                  class="p-1 text-red-700 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="Remove missing field reference"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Relationships -->
  <div>
    <h3 class="text-sm text-mono-300 mb-2 font-medium">Relationships ({(editedItem.relationships || []).length})</h3>

    <div class="space-y-2">
      <!-- Add Relationship Search Dropdown -->
      <div class="relative">
        <div class="relative">
          <input
            type="text"
            bind:value={relationshipSearchQuery}
            onfocus={handleRelationshipFocus}
            onblur={handleRelationshipBlur}
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
                  <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-cube text-mono-400 text-xs"></i>
                    <span class="text-sm text-mono-300">{obj.name}</span>
                  </div>
                </button>
              {/each}
            {:else if relationshipSearchQuery.trim()}
              <div class="px-3 py-2 text-sm text-mono-400">
                No objects found matching "{relationshipSearchQuery}"
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
            {@const fkHint = getFkHint(rel, editedItem.fields, getFieldById, !!targetObj)}
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

              <!-- FK Hint for belongs to (only user-defined; inferred rels have FK on the other side) -->
              {#if fkHint}
                <span class="text-xs {fkHint.hasFk ? 'text-green-400' : 'text-yellow-400'}">
                  {fkHint.hasFk ? `via ${fkHint.fkName} ✓` : `missing ${fkHint.fkName} ✗`}
                </span>
              {/if}

              <div class="flex-1"></div>

              <!-- Inferred Badge -->
              {#if rel.isInferred}
                <span class="text-xs text-mono-500 bg-mono-700 px-2 py-0.5 rounded">
                  auto · on {targetObj?.name ?? '?'}
                </span>
              {/if}

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
      <div class="space-y-1">
        {#each editedItem.usedInApis as apiId}
          {@const api = $apisStore.find(a => a.id === apiId)}
          <button
            type="button"
            onclick={() => goto(`/apis/${apiId}`)}
            class="flex items-center space-x-2 w-full px-3 py-2 bg-mono-800 rounded border border-mono-700 hover:border-mono-600 hover:bg-mono-700 transition-colors text-left"
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
