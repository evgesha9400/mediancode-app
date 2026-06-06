<script module lang="ts">
	export interface ObjectFormContentProps {
		editedItem: import('$lib/types').ObjectDefinition;
		mode: 'creating' | 'editing';
		availableFields: import('$lib/types').Field[];
		modelValidatorTemplates: import('$lib/types').ModelValidatorTemplate[];
		visibleErrors: Record<string, string>;
		onCreateNewField?: () => void;
	}
</script>

<script lang="ts">
	import type { ObjectDefinition, ObjectMember, FieldMember, RelationshipKind } from '$lib/types';
	import type { Field, ModelValidatorTemplate, InlineModelValidator, FieldRole } from '$lib/types';
	import {
		getFieldById,
		getModelValidatorTemplateById,
		objectsStore,
		getObjectById,
		apisStore
	} from '$lib/stores/stores';
	import { ROLE_LABELS, ROLE_TOOLTIPS, getAvailableRoles, roleHasModifiers } from '$lib/types';
	import {
		newTempMemberId,
		transitionObjectMembership,
		type ObjectMembershipTransitionEvent
	} from '$lib/domain/objectMembership';
	import { FormField, FormLabel, TemplateGallery, TemplateForm, Pill } from '$lib/components';
	import { showToast } from '$lib/stores/toasts';
	import { goto } from '$app/navigation';
	import { dragHandleZone, dragHandle } from 'svelte-dnd-action';
	import type { DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import {
		drawerLinkedEntityRow,
		dropdownPanelSolidSurface,
		inputObjectMemberSearch,
		listMetaBadge,
		surfaceInsideFrostedPanel,
		themeAccentBorderEmphasis,
		themeAccentFocusRing,
		themeAccentSurfaceSoft,
		themeAccentText,
		textareaObjectForm
	} from '$lib/ui/classes';
	import {
		OBJECT_MEMBER_DRAG_HANDLE,
		OBJECT_MEMBER_DROPDOWN,
		OBJECT_MEMBER_LIST,
		OBJECT_MEMBER_ROW,
		OBJECT_MEMBER_SEARCH
	} from '$lib/utils/testIds';

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

	const compactMonoControlBase = `bg-surface-raised border border-edge text-fg-secondary rounded-lg focus:ring-1 ${themeAccentFocusRing} focus:border-transparent`;
	const compactMonoInput = `${compactMonoControlBase} font-mono text-sm px-2 py-0.5`;
	const compactMonoInputXs = `${compactMonoControlBase} font-mono text-xs px-2 py-0.5`;
	const compactMonoSelect = `${compactMonoControlBase} text-xs px-1.5 py-0.5`;
	const compactMonoSelectFull = `${compactMonoSelect} w-full min-h-[1.5rem]`;
	const compactMonoToggleOn = `${themeAccentBorderEmphasis} ${themeAccentText} ${themeAccentSurfaceSoft}`;
	const compactMonoToggleOff = 'border-edge-strong text-fg-dimmed hover:border-edge-hover hover:text-fg-muted';
	const compactMonoToggleHidden = 'invisible pointer-events-none border-edge-strong text-fg-dimmed';

	// --- Derive selected field IDs (to exclude already-added fields from unified dropdown) ---
	let selectedFieldIds = $derived(
		editedItem.members.filter((m): m is FieldMember => m.memberType === 'field').map((m) => m.fieldId)
	);

	// --- Drag-and-drop member reordering ---
	// Members carry their own stable id throughout an edit session: either a
	// backend uuid loaded from the server or a `tmp-*` sentinel assigned by
	// Object Membership transitions. DnD uses member.id directly.
	type DndItem = ObjectMember & { id: string };

	// Mutable state for dndzone — synced from editedItem.members
	let dndItems: DndItem[] = $state(editedItem.members.map((m) => ({ ...m, id: m.id! })));

	// Re-sync when editedItem.members changes externally (undo, member add/remove)
	$effect(() => {
		dndItems = editedItem.members.map((m) => ({ ...m, id: m.id! }));
	});

	// Convert DnD items back to ObjectMember[] for editedItem. Stable ids
	// (backend uuids and tmp-* sentinels) stay in memory so subsequent DnD
	// keys don't go undefined; objectsConfig.toUpdatePayload strips tmp-*
	// ids at save time so the backend treats them as inserts.
	function toApiMembers(items: DndItem[]): ObjectMember[] {
		return items.map(({ id, ...member }) => ({ ...member, id }) as ObjectMember);
	}

	function handleDndConsider(e: CustomEvent<DndEvent<DndItem>>) {
		dndItems = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<DndEvent<DndItem>>) {
		dndItems = e.detail.items;
		applyMembershipChange({ type: 'membersReordered', members: toApiMembers(e.detail.items) });
	}

	let availableTargetObjects = $derived($objectsStore);
	let fieldsById = $derived(new Map(availableFields.map((field) => [field.id, field])));
	let objectsById = $derived(new Map(availableTargetObjects.map((object) => [object.id, object])));

	function applyMembershipChange(event: ObjectMembershipTransitionEvent) {
		editedItem = {
			...editedItem,
			members: transitionObjectMembership(editedItem.members, event, {
				sourceObjectName: editedItem.name,
				fieldsById,
				objectsById,
				createMemberId: newTempMemberId
			})
		};
	}

	// Resolve object's field members to full Field objects for template role dropdowns
	let objectFieldDefinitions = $derived.by((): Field[] => {
		return editedItem.members
			.filter((m): m is FieldMember => m.memberType === 'field')
			.map((ref) => getFieldById(ref.fieldId))
			.filter((f): f is Field => f !== undefined);
	});

	function removeMember(id: string) {
		applyMembershipChange({ type: 'memberRemoved', memberId: id });
	}

	/** Change a field member's role — clear modifiers if switching to a non-modifier role */
	function setMemberRole(memberId: string, role: FieldRole) {
		applyMembershipChange({ type: 'fieldMemberRoleChanged', memberId, role });
	}

	/** Toggle nullable for a field member (only for modifier roles) */
	function toggleMemberNullable(memberId: string) {
		applyMembershipChange({ type: 'fieldMemberNullableToggled', memberId });
	}

	/** Map a field type name to the appropriate HTML input type for the default value input. */
	function defaultInputType(fieldType: string): { inputType: string; step?: string; isBool: boolean } {
		switch (fieldType) {
			case 'int':
				return { inputType: 'number', step: '1', isBool: false };
			case 'float':
				return { inputType: 'number', step: 'any', isBool: false };
			case 'bool':
				return { inputType: 'text', isBool: true };
			case 'datetime':
				return { inputType: 'datetime-local', isBool: false };
			case 'date':
				return { inputType: 'date', isBool: false };
			case 'time':
				return { inputType: 'time', isBool: false };
			case 'EmailStr':
				return { inputType: 'email', isBool: false };
			default:
				return { inputType: 'text', isBool: false };
		}
	}

	/** Set literal default value (empty string -> null) */
	function setMemberDefaultValue(memberId: string, value: string) {
		applyMembershipChange({ type: 'fieldMemberDefaultValueChanged', memberId, value });
	}

	/** Update a field member's name */
	function setMemberName(memberId: string, name: string) {
		applyMembershipChange({ type: 'fieldMemberNameChanged', memberId, name });
	}

	// --- Relationship member helpers ---

	// --- Unified member search ---
	let memberSearchQuery = $state('');
	let memberDropdownOpen = $state(false);

	let filteredFieldsForAdd = $derived.by(() => {
		const q = memberSearchQuery.toLowerCase().trim();
		return availableFields
			.filter((field) => !selectedFieldIds.includes(field.id))
			.filter(
				(field) =>
					!q ||
					field.name.toLowerCase().includes(q) ||
					field.type.toLowerCase().includes(q) ||
					(field.description?.toLowerCase().includes(q) ?? false)
			);
	});

	let filteredTargetObjects = $derived.by(() => {
		const q = memberSearchQuery.toLowerCase().trim();
		if (!q) return availableTargetObjects;
		return availableTargetObjects.filter((o) => o.name.toLowerCase().includes(q));
	});

	function handleMemberFocus(): void {
		memberDropdownOpen = true;
	}

	/** Clicks while already focused do not refire `focus` — still open the panel (E2E + real UX). */
	function handleMemberSearchClick(): void {
		memberDropdownOpen = true;
	}

	function handleMemberBlur(): void {
		setTimeout(() => {
			memberDropdownOpen = false;
		}, 150);
	}

	function addRelationshipMember(targetObjectId: string) {
		applyMembershipChange({ type: 'relationshipMemberAdded', targetObjectId });
		memberSearchQuery = '';
		memberDropdownOpen = false;
	}

	function updateRelationshipKind(memberId: string, kind: RelationshipKind) {
		applyMembershipChange({ type: 'relationshipMemberKindChanged', memberId, kind });
	}

	// --- Navigate to source object from derived relationship ---
	function navigateToObject(objectDefinitionId: string) {
		goto(`/objects?highlight=${objectDefinitionId}`);
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

	function handleAddValidator(validator: {
		templateId: string;
		parameters?: Record<string, string>;
		fieldMappings?: Record<string, string>;
	}) {
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
	<FormField id="object-name" label="Object Name" bind:value={editedItem.name} required error={visibleErrors.name} />

	<!-- Description -->
	<div>
		<FormLabel label="Description" forId="object-description" />
		<textarea id="object-description" bind:value={editedItem.description} rows="3" class={textareaObjectForm}
		></textarea>
	</div>

	<!-- Members (unified: scalars + relationships) -->
	<div>
		<h3 class="text-sm text-fg-secondary mb-2 font-medium">Members ({editedItem.members.length})</h3>
		{#if visibleErrors.object_membership_primary}
			<p class="text-xs text-red-400 mb-2">{visibleErrors.object_membership_primary}</p>
		{/if}

		<div class="space-y-2">
			<!-- Unified Member Add Dropdown: Fields + Relationships -->
			<div class="relative">
				<div class="relative">
					<input
						type="text"
						bind:value={memberSearchQuery}
						onfocus={handleMemberFocus}
						onclick={handleMemberSearchClick}
						onblur={handleMemberBlur}
						placeholder="Add field or relationship..."
						data-testid={OBJECT_MEMBER_SEARCH}
						class={inputObjectMemberSearch}
					/>
					<i
						class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted text-xs pointer-events-none"
					></i>
				</div>

				{#if memberDropdownOpen}
					<div
						class="absolute z-10 w-full mt-1 max-h-72 overflow-y-auto flex flex-col {dropdownPanelSolidSurface}"
						data-testid={OBJECT_MEMBER_DROPDOWN}
					>
						<!-- Fields Section -->
						<div class="px-3 pt-2 pb-1">
							<span class="text-[10px] uppercase tracking-widest text-fg-dimmed font-medium">Fields</span>
						</div>
						{#if filteredFieldsForAdd.length > 0}
							{#each filteredFieldsForAdd as field (field.id)}
								<button
									type="button"
									onmousedown={(e) => {
										e.preventDefault();
										applyMembershipChange({ type: 'fieldMemberAdded', fieldId: field.id });
										memberSearchQuery = '';
										memberDropdownOpen = false;
									}}
									class="w-full px-3 py-2 text-left hover:bg-surface-raised border-b border-edge/50 last:border-b-0 transition-colors"
								>
									<div class="flex items-center space-x-2">
										<i class="fa-solid fa-vector-square text-fg-muted text-xs"></i>
										<span class="font-mono text-sm text-fg-secondary">{field.name}</span>
										<span class={listMetaBadge}>{field.type}</span>
									</div>
									{#if field.description}
										<p class="text-xs text-fg-dimmed mt-0.5">{field.description}</p>
									{/if}
								</button>
							{/each}
						{:else}
							<div class="px-3 py-1.5 text-xs text-fg-dimmed italic">
								{memberSearchQuery.trim() ? `No fields matching "${memberSearchQuery}"` : 'No fields available'}
							</div>
						{/if}

						<!-- Create new field footer -->
						{#if onCreateNewField}
							<div class="border-t border-edge p-2">
								<button
									type="button"
									class="w-full text-left px-3 py-1.5 text-sm text-fg-muted hover:bg-surface-raised hover:text-fg rounded-lg cursor-pointer flex items-center space-x-2"
									onmousedown={(e) => {
										e.preventDefault();
										onCreateNewField?.();
									}}
								>
									<i class="fa-solid fa-plus text-xs"></i>
									<span>Create new field</span>
								</button>
							</div>
						{/if}

						<!-- Relationships Section -->
						<div class="px-3 pt-2 pb-1 border-t border-edge">
							<span class="text-[10px] uppercase tracking-widest text-fg-dimmed font-medium">Relationships</span>
						</div>
						{#if filteredTargetObjects.length > 0}
							{#each filteredTargetObjects as obj (obj.id)}
								<button
									type="button"
									onmousedown={(e) => {
										e.preventDefault();
										addRelationshipMember(obj.id);
									}}
									class="w-full px-3 py-2 text-left hover:bg-surface-raised border-b border-edge/50 last:border-b-0 transition-colors"
								>
									<div class="flex items-center space-x-2">
										<i class="fa-solid fa-cube text-fg-muted text-xs"></i>
										<span class="text-sm text-fg-secondary">{obj.name}</span>
									</div>
								</button>
							{/each}
						{:else}
							<div class="px-3 py-1.5 text-xs text-fg-dimmed italic">
								{memberSearchQuery.trim() ? `No objects matching "${memberSearchQuery}"` : 'No other objects available'}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- DnD Member List -->
			{#if editedItem.members.length === 0}
				<div class="p-3 {surfaceInsideFrostedPanel}">
					<p class="text-xs text-fg-muted">No members added</p>
				</div>
			{:else}
				<div
					use:dragHandleZone={{ items: dndItems, flipDurationMs: 150, type: 'members' }}
					onconsider={handleDndConsider}
					onfinalize={handleDndFinalize}
					class="p-2 {surfaceInsideFrostedPanel} space-y-2"
					data-testid={OBJECT_MEMBER_LIST}
				>
					{#each dndItems as item (item.id)}
						<div animate:flip={{ duration: 150 }}>
							{#if item.memberType === 'field'}
								<!-- Field Member Row -->
								{@const field = getFieldById(item.fieldId)}
								{@const availableRoles = field ? getAvailableRoles(field.type) : []}
								{#if field}
									{@const inputCfg = defaultInputType(field.type)}
									{@const modifierClass = roleHasModifiers(item.role) ? '' : 'invisible pointer-events-none'}
									<div class="p-3 {surfaceInsideFrostedPanel} space-y-1.5" data-testid={OBJECT_MEMBER_ROW}>
										<div class="grid grid-cols-[auto_minmax(0,1fr)_10rem_7rem_4.5rem_1.75rem] gap-x-2 items-center">
											<!-- Drag Handle -->
											<div
												use:dragHandle
												class="text-fg-faint hover:text-fg-muted cursor-grab justify-self-start"
												data-testid={OBJECT_MEMBER_DRAG_HANDLE}
											>
												<i class="fa-solid fa-grip-vertical text-xs"></i>
											</div>

											<!-- Field Name and Type -->
											<div class="flex items-center gap-2 min-w-0">
												<input
													type="text"
													value={item.name}
													oninput={(e) => setMemberName(item.id, (e.target as HTMLInputElement).value)}
													class={`${compactMonoInput} w-28`}
													title="Member name (column name in generated code)"
												/>
												<span class={`${listMetaBadge} shrink-0`}>{field.type}</span>
												<span class="text-xs text-fg-dimmed truncate" title="Field: {field.name}">{field.name}</span>
											</div>

											<!-- Role Selector -->
											<select
												class={compactMonoSelectFull}
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
													class={`${compactMonoSelectFull} ${modifierClass}`}
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
													class={`${compactMonoSelectFull} ${modifierClass}`}
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
												class={`justify-self-start text-xs px-2 py-0.5 rounded-lg border transition-colors ${roleHasModifiers(item.role) ? (item.isNullable ? compactMonoToggleOn : compactMonoToggleOff) : compactMonoToggleHidden}`}
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
										{#if visibleErrors[`member_${item.id}_name`]}
											<p class="text-xs text-red-400 ml-6">{visibleErrors[`member_${item.id}_name`]}</p>
										{/if}
										{#if visibleErrors[`member_${item.id}_fieldId`]}
											<p class="text-xs text-red-400 ml-6">{visibleErrors[`member_${item.id}_fieldId`]}</p>
										{/if}
										{#if visibleErrors[`member_${item.id}_role`]}
											<p class="text-xs text-red-400 ml-6">{visibleErrors[`member_${item.id}_role`]}</p>
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
								<div class="p-3 {surfaceInsideFrostedPanel} space-y-1.5" data-testid={OBJECT_MEMBER_ROW}>
									<div class="flex items-center space-x-2">
										<!-- Drag Handle -->
										<div
											use:dragHandle
											class="text-fg-faint hover:text-fg-muted cursor-grab shrink-0"
											data-testid={OBJECT_MEMBER_DRAG_HANDLE}
										>
											<i class="fa-solid fa-grip-vertical text-xs"></i>
										</div>

										<!-- Relationship Name Input -->
										<input
											type="text"
											value={item.name}
											oninput={(e) =>
												applyMembershipChange({
													type: 'relationshipMemberNameChanged',
													memberId: item.id,
													name: (e.target as HTMLInputElement).value
												})}
											class={`${compactMonoInput} w-28`}
											title="Relationship field name"
										/>

										<!-- Kind Dropdown -->
										<select
											value={item.kind}
											onchange={(e) =>
												updateRelationshipKind(item.id, (e.target as HTMLSelectElement).value as RelationshipKind)}
											class={compactMonoSelect}
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
											oninput={(e) =>
												applyMembershipChange({
													type: 'relationshipMemberInverseNameChanged',
													memberId: item.id,
													inverseName: (e.target as HTMLInputElement).value
												})}
											class={`${compactMonoInputXs} w-24`}
											placeholder="inverse name"
											title="Inverse relationship name on the target object"
										/>

										<!-- Required Toggle (hidden for many_to_many per D2) -->
										{#if item.kind !== 'many_to_many'}
											<button
												type="button"
												onclick={() =>
													applyMembershipChange({ type: 'relationshipMemberRequiredToggled', memberId: item.id })}
												title="Whether the target relationship is required"
												class={`text-xs px-2 py-0.5 rounded-lg border transition-colors shrink-0 ${item.required ? compactMonoToggleOn : compactMonoToggleOff}`}
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
									{#if visibleErrors[`member_${item.id}_name`]}
										<p class="text-xs text-red-400 ml-6">{visibleErrors[`member_${item.id}_name`]}</p>
									{/if}
									{#if visibleErrors[`member_${item.id}_inverseName`]}
										<p class="text-xs text-red-400 ml-6">{visibleErrors[`member_${item.id}_inverseName`]}</p>
									{/if}
									{#if visibleErrors[`member_${item.id}_targetObjectId`]}
										<p class="text-xs text-red-400 ml-6">{visibleErrors[`member_${item.id}_targetObjectId`]}</p>
									{/if}
									{#if visibleErrors[`member_${item.id}_required`]}
										<p class="text-xs text-red-400 ml-6">{visibleErrors[`member_${item.id}_required`]}</p>
									{/if}
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
			<h3 class="text-sm text-fg-secondary mb-2 font-medium">
				Incoming Relationships ({editedItem.derivedRelationships.length})
			</h3>
			<div class="space-y-1">
				{#each editedItem.derivedRelationships as dr}
					<div
						class="flex items-center space-x-2 px-2 py-1.5 bg-surface-raised rounded-lg border border-dashed border-edge-strong"
					>
						<button
							type="button"
							onclick={() => navigateToObject(dr.sourceObjectId)}
							class="text-xs text-blue-400 hover:underline"
						>
							{dr.sourceObject}.{dr.sourceField}
						</button>
						<span class="text-xs text-fg-muted bg-surface-overlay px-2 py-0.5 rounded">
							{dr.kind.replace(/_/g, ' ')}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Validators -->
	<div>
		<h3 class="text-sm text-fg-secondary mb-2 font-medium">Validators ({editedItem.validators.length})</h3>

		<div class="space-y-2">
			{#if !validatorGalleryOpen}
				<button
					type="button"
					onclick={openValidatorGallery}
					class="w-full px-3 py-2 rounded-xl border border-dashed border-edge-strong text-sm text-fg-muted hover:border-edge-hover hover:bg-surface-raised hover:text-fg-secondary transition-colors cursor-pointer"
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
						onBack={() => (selectedModelTemplate = null)}
					/>
				</div>
			{:else}
				<div class="p-3 {surfaceInsideFrostedPanel}">
					<TemplateGallery
						kind="model"
						modelTemplates={modelValidatorTemplates}
						onSelectModel={handleSelectModelTemplate}
						onClose={() => (validatorGalleryOpen = false)}
					/>
				</div>
			{/if}

			{#if editedItem.validators.length > 0}
				<div class="p-2 {surfaceInsideFrostedPanel} space-y-2">
					{#each editedItem.validators as validator, index}
						{@const tmpl = getModelValidatorTemplateById(validator.templateId)}
						<div class="flex items-center space-x-2 p-3 {surfaceInsideFrostedPanel}">
							<div class="flex items-center space-x-2 flex-1 min-w-0">
								<span class="text-sm text-fg-secondary truncate">{tmpl?.name ?? validator.templateId}</span>
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
			<h3 class="text-sm text-fg-secondary mb-2 font-medium">Used In APIs ({editedItem.usedInApis.length})</h3>
			<div class="space-y-1">
				{#each editedItem.usedInApis as apiId}
					{@const api = $apisStore.find((a) => a.id === apiId)}
					<button type="button" onclick={() => goto(`/apis/${apiId}`)} class={drawerLinkedEntityRow}>
						<i class="fa-solid fa-code text-fg-muted text-xs"></i>
						<span class="text-sm text-fg">{api?.title ?? apiId}</span>
						{#if api?.version}
							<span class="text-xs text-fg-dimmed">{api.version}</span>
						{/if}
						<div class="flex-1"></div>
						<i class="fa-solid fa-arrow-right text-fg-faint text-xs"></i>
					</button>
				{/each}
				{#if editedItem.usedInApis.length === 0}
					<p class="text-sm text-fg-muted italic">Not used in any APIs</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
