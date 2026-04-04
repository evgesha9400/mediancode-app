<script module lang="ts">
  export interface ObjectFormContentProps {
    editedItem: import('$lib/types').ObjectDefinition;
    mode: 'creating' | 'editing';
    availableFields: import('$lib/stores/fields').Field[];
    modelValidatorTemplates: import('$lib/types').ModelValidatorTemplate[];
    visibleErrors: Record<string, string>;
    onCreateNewField?: () => void;
  }
</script>

<script lang="ts">
  import type { ObjectDefinition, ObjectMember, ScalarMember, RelationshipMember, RelationshipKind } from '$lib/types';
  import type { Field } from '$lib/stores/fields';
  import type { ModelValidatorTemplate, InlineModelValidator, FieldRole } from '$lib/types';
  import { getFieldById } from '$lib/stores/fields';
  import { ROLE_LABELS, ROLE_TOOLTIPS, getAvailableRoles, roleHasModifiers } from '$lib/types';
  import {
    FormField,
    FormLabel,
    TemplateGallery,
    TemplateForm,
    Pill
  } from '$lib/components';
  import { getModelValidatorTemplateById } from '$lib/stores/modelValidatorTemplates';
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import { apisStore } from '$lib/stores/apis';
  import { showToast } from '$lib/stores/toasts';
  import { goto } from '$app/navigation';
  import { dragHandleZone, dragHandle } from 'svelte-dnd-action';
  import type { DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import {
    drawerLinkedEntityRow,
    inputObjectMemberSearch,
    surfaceInsideFrostedPanel,
    textareaObjectForm,
  } from '$lib/ui/classes';

  let {
    editedItem = $bindable(),
    mode,
    availableFields,
    modelValidatorTemplates,
    visibleErrors,
    onCreateNewField
  }: ObjectFormContentProps = $props();

  // --- Relationship kind options ---
  const KIND_OPTIONS: { value: RelationshipKind; label: string }[] = [
    { value: 'one_to_one', label: 'has one' },
    { value: 'one_to_many', label: 'has many' },
    { value: 'many_to_many', label: 'many to many' }
  ];

  // --- Derive selected field IDs (to exclude already-added fields from unified dropdown) ---
  let selectedFieldIds = $derived(
    editedItem.members
      .filter((m): m is ScalarMember => m.memberType === 'scalar')
      .map(m => m.fieldId)
  );

  // --- Drag-and-drop member reordering ---
  type DndItem = ObjectMember & { id: string };

  // Snapshot of original members for distinguishing backend-assigned IDs from temp IDs
  let originalMembers: ObjectMember[] = [...editedItem.members];

  // Mutable state for dndzone — synced from editedItem.members
  let dndItems: DndItem[] = $state(
    editedItem.members.map(m => ({
      ...m,
      id: m.id ?? crypto.randomUUID()
    }))
  );

  // Re-sync when editedItem.members changes externally (undo, member add/remove)
  $effect(() => {
    dndItems = editedItem.members.map(m => ({
      ...m,
      id: m.id ?? crypto.randomUUID()
    }));
    originalMembers = [...editedItem.members];
  });

  // Convert DnD items back to API-ready members (strip temp IDs from new members)
  function toApiMembers(items: DndItem[]): ObjectMember[] {
    return items.map(({ id, ...member }) => {
      const isBackendAssigned = originalMembers.some(m => m.id === id);
      return isBackendAssigned ? { ...member, id } : member;
    }) as ObjectMember[];
  }

  function handleDndConsider(e: CustomEvent<DndEvent<DndItem>>) {
    dndItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<DndItem>>) {
    dndItems = e.detail.items;
    editedItem = { ...editedItem, members: toApiMembers(e.detail.items) };
  }

  // Resolve object's scalar members to full Field objects for template role dropdowns
  let objectFieldDefinitions = $derived.by((): Field[] => {
    return editedItem.members
      .filter((m): m is ScalarMember => m.memberType === 'scalar')
      .map(ref => getFieldById(ref.fieldId))
      .filter((f): f is Field => f !== undefined);
  });

  // --- Scalar member helpers ---
  function addScalarMember(fieldId: string) {
    const field = getFieldById(fieldId);
    if (!field) return;
    const newMember: ScalarMember = {
      memberType: 'scalar',
      id: crypto.randomUUID(),
      name: field.name,
      fieldId,
      role: 'writable',
      isNullable: false
    };
    editedItem = {
      ...editedItem,
      members: [...editedItem.members, newMember]
    };
  }

  function removeMember(id: string) {
    editedItem = {
      ...editedItem,
      members: editedItem.members.filter(m => m.id !== id)
    };
  }

  /** Change a scalar member's role — clear modifiers if switching to a non-modifier role */
  function setMemberRole(memberId: string, role: FieldRole) {
    const newMembers = editedItem.members.map(m => {
      if (m.id !== memberId || m.memberType !== 'scalar') return m;
      const base = { ...m, role };
      if (!roleHasModifiers(role)) {
        return { ...base, isNullable: false, defaultValue: null };
      }
      return base;
    });
    // Only one PK allowed — if setting to PK, clear PK on all other scalar members
    if (role === 'pk') {
      editedItem = {
        ...editedItem,
        members: newMembers.map(m =>
          m.id !== memberId && m.memberType === 'scalar' && m.role === 'pk'
            ? { ...m, role: 'writable' as FieldRole, isNullable: false }
            : m
        )
      };
    } else {
      editedItem = { ...editedItem, members: newMembers };
    }
  }

  /** Toggle nullable for a scalar member (only for modifier roles) */
  function toggleMemberNullable(memberId: string) {
    const newMembers = editedItem.members.map(m => {
      if (m.id !== memberId || m.memberType !== 'scalar') return m;
      if (!roleHasModifiers(m.role)) return m;
      return { ...m, isNullable: !m.isNullable };
    });
    editedItem = { ...editedItem, members: newMembers };
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
      default:         return { inputType: 'text', isBool: false };
    }
  }

  /** Set literal default value (empty string -> null) */
  function setMemberDefaultValue(memberId: string, value: string) {
    const newMembers = editedItem.members.map(m => {
      if (m.id !== memberId || m.memberType !== 'scalar') return m;
      return { ...m, defaultValue: value.trim() || null };
    });
    editedItem = { ...editedItem, members: newMembers };
  }

  /** Update a scalar member's name */
  function setMemberName(memberId: string, name: string) {
    const newMembers = editedItem.members.map(m => {
      if (m.id !== memberId) return m;
      return { ...m, name };
    });
    editedItem = { ...editedItem, members: newMembers };
  }

  // --- Relationship member helpers ---

  let availableTargetObjects = $derived($objectsStore);

  // --- Unified member search ---
  let memberSearchQuery = $state('');
  let memberDropdownOpen = $state(false);

  let filteredFieldsForAdd = $derived.by(() => {
    const q = memberSearchQuery.toLowerCase().trim();
    return availableFields
      .filter(field => !selectedFieldIds.includes(field.id))
      .filter(field =>
        !q ||
        field.name.toLowerCase().includes(q) ||
        field.type.toLowerCase().includes(q) ||
        (field.description?.toLowerCase().includes(q) ?? false)
      );
  });

  let filteredTargetObjects = $derived.by(() => {
    const q = memberSearchQuery.toLowerCase().trim();
    if (!q) return availableTargetObjects;
    return availableTargetObjects.filter(o => o.name.toLowerCase().includes(q));
  });

  function handleMemberFocus(): void {
    memberDropdownOpen = true;
  }

  function handleMemberBlur(): void {
    setTimeout(() => { memberDropdownOpen = false; }, 150);
  }

  function addRelationshipMember(targetObjectId: string) {
    const targetObj = getObjectById(targetObjectId);
    if (!targetObj) return;
    const defaultName = targetObj.name.toLowerCase() + 's';
    const defaultInverseName = editedItem.name ? editedItem.name.toLowerCase() : 'source';
    const newMember: RelationshipMember = {
      memberType: 'relationship',
      id: crypto.randomUUID(),
      name: defaultName,
      targetObjectId,
      kind: 'one_to_many',
      inverseName: defaultInverseName,
      required: true
    };
    editedItem = {
      ...editedItem,
      members: [...editedItem.members, newMember]
    };
    memberSearchQuery = '';
    memberDropdownOpen = false;
  }

  function updateRelationshipField(memberId: string, updates: Partial<RelationshipMember>) {
    editedItem = {
      ...editedItem,
      members: editedItem.members.map(m => {
        if (m.id !== memberId || m.memberType !== 'relationship') return m;
        const updated = { ...m, ...updates };
        // D2: many_to_many forces required=false
        if (updated.kind === 'many_to_many') {
          updated.required = false;
        }
        return updated;
      })
    };
  }

  function updateRelationshipKind(memberId: string, kind: RelationshipKind) {
    const member = editedItem.members.find(m => m.id === memberId);
    if (!member || member.memberType !== 'relationship') return;
    const targetObj = getObjectById(member.targetObjectId);
    // Auto-update name based on kind (D20)
    const autoName = targetObj
      ? (kind === 'one_to_many' || kind === 'many_to_many'
        ? targetObj.name.toLowerCase() + 's'
        : targetObj.name.toLowerCase())
      : member.name;
    updateRelationshipField(memberId, { kind, name: autoName });
  }

  // --- Navigate to source object from derived relationship ---
  function navigateToObject(objectId: string) {
    goto(`/objects?highlight=${objectId}`);
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
      class={textareaObjectForm}
    ></textarea>
  </div>

  <!-- Members (unified: scalars + relationships) -->
  <div>
    <h3 class="text-sm text-mono-300 mb-2 font-medium">Members ({editedItem.members.length})</h3>

    <div class="space-y-2">
      <!-- Unified Member Add Dropdown: Fields + Relationships -->
      <div class="relative">
        <div class="relative">
          <input
            type="text"
            bind:value={memberSearchQuery}
            onfocus={handleMemberFocus}
            onblur={handleMemberBlur}
            placeholder="Add field or relationship..."
            class={inputObjectMemberSearch}
          />
          <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
        </div>

        {#if memberDropdownOpen}
          <div class="absolute z-10 w-full mt-1 bg-mono-950 border border-mono-700/80 rounded-xl shadow-lg shadow-black/30 max-h-72 overflow-y-auto flex flex-col">

            <!-- Fields Section -->
            <div class="px-3 pt-2 pb-1">
              <span class="text-[10px] uppercase tracking-widest text-mono-500 font-medium">Fields</span>
            </div>
            {#if filteredFieldsForAdd.length > 0}
              {#each filteredFieldsForAdd as field (field.id)}
                <button
                  type="button"
                  onmousedown={(e) => { e.preventDefault(); addScalarMember(field.id); memberSearchQuery = ''; memberDropdownOpen = false; }}
                  class="w-full px-3 py-2 text-left hover:bg-mono-800 border-b border-mono-700/50 last:border-b-0 transition-colors"
                >
                  <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-vector-square text-mono-400 text-xs"></i>
                    <span class="font-mono text-sm text-mono-300">{field.name}</span>
                    <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded-lg">{field.type}</span>
                  </div>
                  {#if field.description}
                    <p class="text-xs text-mono-500 mt-0.5">{field.description}</p>
                  {/if}
                </button>
              {/each}
            {:else}
              <div class="px-3 py-1.5 text-xs text-mono-500 italic">
                {memberSearchQuery.trim() ? `No fields matching "${memberSearchQuery}"` : 'No fields available'}
              </div>
            {/if}

            <!-- Create new field footer -->
            {#if onCreateNewField}
              <div class="border-t border-mono-700 p-2">
                <button
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-sm text-mono-400 hover:bg-mono-800 hover:text-mono-100 rounded-lg cursor-pointer flex items-center space-x-2"
                  onmousedown={(e) => { e.preventDefault(); onCreateNewField?.(); }}
                >
                  <i class="fa-solid fa-plus text-xs"></i>
                  <span>Create new field</span>
                </button>
              </div>
            {/if}

            <!-- Relationships Section -->
            <div class="px-3 pt-2 pb-1 border-t border-mono-700">
              <span class="text-[10px] uppercase tracking-widest text-mono-500 font-medium">Relationships</span>
            </div>
            {#if filteredTargetObjects.length > 0}
              {#each filteredTargetObjects as obj (obj.id)}
                <button
                  type="button"
                  onmousedown={(e) => { e.preventDefault(); addRelationshipMember(obj.id); }}
                  class="w-full px-3 py-2 text-left hover:bg-mono-800 border-b border-mono-700/50 last:border-b-0 transition-colors"
                >
                  <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-cube text-mono-400 text-xs"></i>
                    <span class="text-sm text-mono-300">{obj.name}</span>
                  </div>
                </button>
              {/each}
            {:else}
              <div class="px-3 py-1.5 text-xs text-mono-500 italic">
                {memberSearchQuery.trim() ? `No objects matching "${memberSearchQuery}"` : 'No other objects available'}
              </div>
            {/if}

          </div>
        {/if}
      </div>

      <!-- DnD Member List -->
      {#if editedItem.members.length === 0}
        <div class="p-3 {surfaceInsideFrostedPanel}">
          <p class="text-xs text-mono-400">No members added</p>
        </div>
      {:else}
        <div
          use:dragHandleZone={{ items: dndItems, flipDurationMs: 150, type: 'members' }}
          onconsider={handleDndConsider}
          onfinalize={handleDndFinalize}
          class="p-2 {surfaceInsideFrostedPanel} space-y-2"
        >
          {#each dndItems as item (item.id)}
            <div animate:flip={{ duration: 150 }}>
              {#if item.memberType === 'scalar'}
                <!-- Scalar Member Row -->
                {@const field = getFieldById(item.fieldId)}
                {@const availableRoles = field ? getAvailableRoles(field.type) : []}
                {#if field}
                  {@const inputCfg = defaultInputType(field.type)}
                  {@const modifierClass = roleHasModifiers(item.role) ? '' : 'invisible pointer-events-none'}
                  <div class="p-3 {surfaceInsideFrostedPanel} space-y-1.5">
                    <div
                      class="grid grid-cols-[auto_minmax(0,1fr)_10rem_7rem_4.5rem_1.75rem] gap-x-2 items-center"
                    >
                      <!-- Drag Handle -->
                      <div use:dragHandle class="text-mono-600 hover:text-mono-400 cursor-grab justify-self-start">
                        <i class="fa-solid fa-grip-vertical text-xs"></i>
                      </div>

                      <!--
                        TODO(mediancode): Review scalar member rename vs codegen — see api/services/generation.py
                        same topic (InputField / query params from object use field.name, not member.name).
                        - Object drawer: user can set ScalarMember.name per object; fieldId points at the Field row;
                          create/update payloads include this name; backend stores it and requires unique names
                          per object.
                        - Backend zip generation: scalar model fields and query params derived from an object
                          still use Field.name today, so renaming here often does not change generated FastAPI
                          attribute / query names (relationship members do use member.name).
                        - Frontend: e.g. resolveTargetFields (lib/domain/paramInference.ts) and examples.ts
                          keys use member.name — diverges from codegen behavior above.
                        - Decide later: drive codegen from member.name for scalars (and align query-param
                          naming), or make Field.name the single source of truth and adjust UI copy / controls.
                      -->
                      <!-- Field Name and Type -->
                      <div class="flex items-center gap-2 min-w-0">
                        <input
                          type="text"
                          value={item.name}
                          oninput={(e) => setMemberName(item.id, (e.target as HTMLInputElement).value)}
                          class="font-mono text-sm text-mono-300 bg-mono-800 border border-mono-700 px-2 py-0.5 rounded-lg w-28 focus:ring-1 focus:ring-green-400 focus:border-transparent"
                          title="Member name (column name in generated code)"
                        />
                        <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded-lg shrink-0">{field.type}</span>
                        <span class="text-xs text-mono-500 truncate" title="Field: {field.name}">{field.name}</span>
                      </div>

                      <!-- Role Selector -->
                      <select
                        class="w-full min-h-[1.5rem] bg-mono-800 border border-mono-700 text-mono-300 text-xs rounded-lg px-1.5 py-0.5 focus:ring-1 focus:ring-green-400 focus:border-transparent"
                        value={item.role}
                        onchange={(e) => setMemberRole(item.id, e.currentTarget.value as FieldRole)}
                        title={ROLE_TOOLTIPS[item.role]}
                      >
                        {#each availableRoles as role}
                          <option value={role}>{ROLE_LABELS[role]}</option>
                        {/each}
                      </select>

                      <!-- Default Value Input -->
                      {#if inputCfg.isBool}
                        <select
                          class="bg-mono-800 border border-mono-700 text-mono-300 text-xs rounded-lg px-1.5 py-0.5 w-full min-h-[1.5rem] focus:ring-1 focus:ring-green-400 focus:border-transparent {modifierClass}"
                          value={item.defaultValue ?? ''}
                          onchange={(e) => setMemberDefaultValue(item.id, e.currentTarget.value)}
                          disabled={!roleHasModifiers(item.role)}
                        >
                          <option value="">-- none --</option>
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      {:else}
                        <input
                          type={inputCfg.inputType}
                          step={inputCfg.step}
                          class="bg-mono-800 border border-mono-700 text-mono-300 text-xs rounded-lg px-1.5 py-0.5 w-full min-h-[1.5rem] focus:ring-1 focus:ring-green-400 focus:border-transparent {modifierClass}"
                          placeholder="Default value"
                          value={item.defaultValue ?? ''}
                          oninput={(e) => setMemberDefaultValue(item.id, e.currentTarget.value)}
                          disabled={!roleHasModifiers(item.role)}
                        />
                      {/if}

                      <!-- Nullable Toggle -->
                      <button
                        type="button"
                        onclick={() => toggleMemberNullable(item.id)}
                        disabled={!roleHasModifiers(item.role)}
                        title="Allow null values"
                        class="justify-self-start text-xs px-2 py-0.5 rounded-lg border transition-colors {roleHasModifiers(item.role) ? (item.isNullable ? 'border-green-500 text-green-400 bg-green-400/10' : 'border-mono-600 text-mono-500 hover:border-mono-500 hover:text-mono-400') : 'invisible pointer-events-none border-mono-600 text-mono-500'}"
                      >
                        nullable
                      </button>

                      <!-- Remove Button -->
                      <button
                        type="button"
                        onclick={() => removeMember(item.id)}
                        class="text-red-700 hover:text-red-600 transition-colors justify-self-end"
                        title="Remove member"
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
                      onclick={() => removeMember(item.id)}
                      class="p-1 text-red-700 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remove missing field reference"
                    >
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                {/if}

              {:else if item.memberType === 'relationship'}
                <!-- Relationship Member Row -->
                {@const targetObj = getObjectById(item.targetObjectId)}
                <div class="p-3 {surfaceInsideFrostedPanel} space-y-1.5">
                  <div class="flex items-center space-x-2">
                    <!-- Drag Handle -->
                    <div use:dragHandle class="text-mono-600 hover:text-mono-400 cursor-grab shrink-0">
                      <i class="fa-solid fa-grip-vertical text-xs"></i>
                    </div>

                    <!-- Relationship Name Input -->
                    <input
                      type="text"
                      value={item.name}
                      oninput={(e) => updateRelationshipField(item.id, { name: (e.target as HTMLInputElement).value })}
                      class="font-mono text-sm text-mono-300 bg-mono-800 border border-mono-700 px-2 py-0.5 rounded-lg w-28 focus:ring-1 focus:ring-green-400 focus:border-transparent"
                      title="Relationship field name"
                    />

                    <!-- Kind Dropdown -->
                    <select
                      value={item.kind}
                      onchange={(e) => updateRelationshipKind(item.id, (e.target as HTMLSelectElement).value as RelationshipKind)}
                      class="text-xs text-mono-300 bg-mono-800 border border-mono-700 px-2 py-0.5 rounded-lg focus:ring-1 focus:ring-green-400"
                    >
                      {#each KIND_OPTIONS as opt}
                        <option value={opt.value}>{opt.label}</option>
                      {/each}
                    </select>

                    <!-- Target Object Badge -->
                    <span class="text-xs font-medium px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400">
                      {targetObj?.name ?? 'Unknown'}
                    </span>

                    <!-- Inverse Name Input -->
                    <input
                      type="text"
                      value={item.inverseName}
                      oninput={(e) => updateRelationshipField(item.id, { inverseName: (e.target as HTMLInputElement).value })}
                      class="font-mono text-xs text-mono-300 bg-mono-800 border border-mono-700 px-2 py-0.5 rounded-lg w-24 focus:ring-1 focus:ring-green-400 focus:border-transparent"
                      placeholder="inverse name"
                      title="Inverse relationship name on the target object"
                    />

                    <!-- Required Toggle (hidden for many_to_many per D2) -->
                    {#if item.kind !== 'many_to_many'}
                      <button
                        type="button"
                        onclick={() => updateRelationshipField(item.id, { required: !item.required })}
                        title="Whether the FK column is NOT NULL"
                        class="text-xs px-2 py-0.5 rounded-lg border transition-colors shrink-0 {item.required ? 'border-green-500 text-green-400 bg-green-400/10' : 'border-mono-600 text-mono-500 hover:border-mono-500 hover:text-mono-400'}"
                      >
                        required
                      </button>
                    {/if}

                    <div class="flex-1"></div>

                    <!-- Remove Button -->
                    <button
                      type="button"
                      onclick={() => removeMember(item.id)}
                      class="text-red-700 hover:text-red-600 transition-colors shrink-0"
                      title="Remove relationship"
                    >
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Derived Relationships (read-only, incoming from other objects) -->
  {#if editedItem.derivedRelationships.length > 0}
    <div>
      <h3 class="text-sm text-mono-300 mb-2 font-medium">
        Incoming Relationships ({editedItem.derivedRelationships.length})
      </h3>
      <div class="space-y-1">
        {#each editedItem.derivedRelationships as dr}
          <div class="flex items-center space-x-2 px-2 py-1.5 bg-mono-800 rounded-lg border border-dashed border-mono-600">
            <button
              type="button"
              onclick={() => navigateToObject(dr.sourceObjectId)}
              class="text-xs text-blue-400 hover:underline"
            >
              {dr.sourceObject}.{dr.sourceField}
            </button>
            <span class="text-xs text-mono-400 bg-mono-700 px-2 py-0.5 rounded">
              {dr.kind.replace(/_/g, ' ')}
            </span>
            {#if dr.impliesFk}
              <span class="text-xs text-mono-500">implies {dr.impliesFk}</span>
            {:else if dr.junctionTable}
              <span class="text-xs text-mono-500">via {dr.junctionTable}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

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
      {:else if selectedModelTemplate}
        <div class="p-3 {surfaceInsideFrostedPanel}">
          <TemplateForm
            kind="model"
            modelTemplate={selectedModelTemplate}
            availableFields={objectFieldDefinitions}
            onAdd={handleAddValidator}
            onBack={() => selectedModelTemplate = null}
          />
        </div>
      {:else}
        <div class="p-3 {surfaceInsideFrostedPanel}">
          <TemplateGallery
            kind="model"
            modelTemplates={modelValidatorTemplates}
            onSelectModel={handleSelectModelTemplate}
            onClose={() => validatorGalleryOpen = false}
          />
        </div>
      {/if}

      {#if editedItem.validators.length > 0}
        <div class="p-2 {surfaceInsideFrostedPanel} space-y-2">
          {#each editedItem.validators as validator, index}
            {@const tmpl = getModelValidatorTemplateById(validator.templateId)}
            <div class="flex items-center space-x-2 p-3 {surfaceInsideFrostedPanel}">
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
