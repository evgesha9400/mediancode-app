<script lang="ts">
	import { fieldsStore, searchFields, getTotalFieldCount, updateField, deleteField, type Field, type FieldValidator } from '$lib/stores/fields';
	import { validatorsStore, type Validator } from '$lib/stores/validators';
	import { clerkState, signOut } from '$lib/clerk';
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';

	let searchQuery = '';
	let selectedField: Field | null = null;
	let drawerOpen = false;
	let editMode = false;

	// Form fields for editing
	let editedField: Field | null = null;
	let validationErrors: Record<string, string> = {};
	let saveSuccess = false;
	let showDeleteConfirm = false;

	$: filteredFields = searchFields(searchQuery);
	$: totalCount = getTotalFieldCount();
	$: validators = $validatorsStore;

	function selectField(field: Field) {
		selectedField = field;
		editedField = JSON.parse(JSON.stringify(field)); // Deep clone
		drawerOpen = true;
		editMode = true;
		validationErrors = {};
		saveSuccess = false;
		showDeleteConfirm = false;
	}

	function closeDrawer() {
		drawerOpen = false;
		setTimeout(() => {
			selectedField = null;
			editedField = null;
			editMode = false;
			validationErrors = {};
			saveSuccess = false;
			showDeleteConfirm = false;
		}, 300);
	}

	function isSelected(field: Field): boolean {
		return selectedField?.id === field.id;
	}

	function validateForm(): boolean {
		validationErrors = {};
		let isValid = true;

		if (!editedField) return false;

		if (!editedField.name.trim()) {
			validationErrors.name = 'Field name is required';
			isValid = false;
		}

		if (!editedField.type) {
			validationErrors.type = 'Type is required';
			isValid = false;
		}

		return isValid;
	}

	function handleSave() {
		if (!editedField || !validateForm()) return;

		updateField(editedField.id, editedField);
		selectedField = editedField;
		saveSuccess = true;

		setTimeout(() => {
			saveSuccess = false;
		}, 3000);
	}

	function handleCancel() {
		if (selectedField) {
			editedField = JSON.parse(JSON.stringify(selectedField));
			validationErrors = {};
			saveSuccess = false;
		}
	}

	function handleDelete() {
		if (!editedField) return;
		deleteField(editedField.id);
		closeDrawer();
	}

	function addValidator() {
		if (!editedField) return;
		editedField.validators = [...editedField.validators, { name: 'min_length', params: { value: 1 } }];
	}

	function removeValidator(index: number) {
		if (!editedField) return;
		editedField.validators = editedField.validators.filter((_, i) => i !== index);
	}

	function updateValidatorName(index: number, name: string) {
		if (!editedField) return;
		const validator = validators.find(v => v.name === name);
		if (!validator) return;

		const newValidators = [...editedField.validators];
		newValidators[index] = { name, params: {} };
		editedField.validators = newValidators;
	}

	function formatValidatorDisplay(validator: FieldValidator): string {
		if (!validator.params || Object.keys(validator.params).length === 0) {
			return validator.name;
		}
		const paramStr = Object.entries(validator.params)
			.map(([key, value]) => `${key}: ${value}`)
			.join(', ');
		return `${validator.name} (${paramStr})`;
	}

	function formatValidatorPill(validator: FieldValidator): string {
		if (!validator.params || Object.keys(validator.params).length === 0) {
			return validator.name;
		}
		const value = validator.params.value;
		if (value !== undefined) {
			return `${validator.name}: ${value}`;
		}
		return validator.name;
	}

	async function handleSignOut() {
		await signOut();
		goto('/signin');
	}
</script>

<div class="flex h-screen bg-mono-50">
	<!-- Sidebar Navigation -->
	<div class="w-64 bg-mono-900 text-white flex flex-col">
		<div class="p-4 border-b border-mono-800">
			<div class="flex items-center space-x-2">
				<i class="fa-solid fa-code text-xl"></i>
				<h1 class="text-lg font-semibold">Median Code</h1>
			</div>
		</div>

		<div class="p-4">
			<h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Core Components</h2>
			<ul class="space-y-1">
				<li>
					<a
						href="/dashboard"
						class="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-mono-800 cursor-pointer"
					>
						<i class="fa-solid fa-house w-5"></i>
						<span>Dashboard</span>
					</a>
				</li>
				<li>
					<a
						href="/validators"
						class="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-mono-800 cursor-pointer"
					>
						<i class="fa-solid fa-check-circle w-5"></i>
						<span>Validators</span>
					</a>
				</li>
				<li>
					<a
						href="/field-registry"
						class="flex items-center space-x-2 px-2 py-1.5 rounded-md bg-mono-800 cursor-pointer"
					>
						<i class="fa-solid fa-table-list w-5"></i>
						<span>Field Registry</span>
					</a>
				</li>
				<li>
					<button
						type="button"
						class="w-full flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-mono-800 cursor-pointer text-left"
						disabled
					>
						<i class="fa-solid fa-code w-5"></i>
						<span class="opacity-60">API Designer</span>
					</button>
				</li>
			</ul>
		</div>

		<div class="mt-auto p-4 border-t border-mono-800">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-2">
					{#if $clerkState.user?.imageUrl}
						<img
							src={$clerkState.user.imageUrl}
							alt="User avatar"
							class="w-8 h-8 rounded-full"
						/>
					{:else}
						<div class="w-8 h-8 rounded-full bg-mono-700 flex items-center justify-center">
							<i class="fa-solid fa-user text-sm"></i>
						</div>
					{/if}
					<div class="flex-1 min-w-0">
						<p class="text-sm truncate">
							{$clerkState.user?.fullName || 'Developer'}
						</p>
						<p class="text-xs text-mono-400 truncate">Developer</p>
					</div>
				</div>
				<button
					on:click={handleSignOut}
					class="text-mono-400 hover:text-white transition-colors p-1"
					title="Sign out"
				>
					<i class="fa-solid fa-arrow-right-from-bracket"></i>
				</button>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Header -->
		<div class="bg-white border-b border-mono-200 py-4 px-6">
			<div class="flex justify-between items-center">
				<h1 class="text-xl text-mono-800 font-semibold">Unified Field Registry</h1>
				<div class="flex items-center space-x-4">
					<button
						type="button"
						disabled
						class="px-4 py-2 bg-mono-400 text-white rounded-md flex items-center space-x-2 cursor-not-allowed opacity-60"
						title="Coming soon"
					>
						<i class="fa-solid fa-plus"></i>
						<span>Add Field</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Search and Filter Bar -->
		<div class="bg-white border-b border-mono-200 py-3 px-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4 flex-1">
					<div class="relative flex-1 max-w-md">
						<input
							type="text"
							placeholder="Search fields..."
							bind:value={searchQuery}
							class="w-full pl-10 pr-4 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
						/>
						<i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-mono-400"></i>
					</div>
					<div class="flex items-center space-x-2">
						<button
							type="button"
							disabled
							class="flex items-center space-x-2 px-3 py-2 border border-mono-300 rounded-md cursor-not-allowed opacity-60"
						>
							<i class="fa-solid fa-filter text-mono-500"></i>
							<span>Filter</span>
						</button>
					</div>
				</div>
				<div class="flex items-center text-sm text-mono-500">
					<span>{filteredFields.length} field{filteredFields.length !== 1 ? 's' : ''}</span>
				</div>
			</div>
		</div>

		<!-- Table Container -->
		<div class="flex-1 overflow-auto">
			<table class="min-w-full bg-white">
				<thead class="bg-mono-50 sticky top-0">
					<tr>
						<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
							<div class="flex items-center space-x-1">
								<span>Field Name</span>
								<i class="fa-solid fa-sort"></i>
							</div>
						</th>
						<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
							<div class="flex items-center space-x-1">
								<span>Type</span>
								<i class="fa-solid fa-sort"></i>
							</div>
						</th>
						<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
							<div class="flex items-center space-x-1">
								<span>Validators</span>
							</div>
						</th>
						<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
							<div class="flex items-center space-x-1">
								<span>Default Value</span>
								<i class="fa-solid fa-sort"></i>
							</div>
						</th>
						<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
							<div class="flex items-center space-x-1">
								<span>Used In APIs</span>
								<i class="fa-solid fa-sort"></i>
							</div>
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-mono-200">
					{#each filteredFields as field}
						<tr
							on:click={() => selectField(field)}
							class="cursor-pointer transition-colors {isSelected(field) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
						>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-mono-900 font-medium">{field.name}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white">
									{field.type}
								</span>
							</td>
							<td class="px-6 py-4 text-sm text-mono-500">
								{#if field.validators.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each field.validators as validator}
											<span class="px-2 py-0.5 text-xs rounded-full bg-mono-100">
												{formatValidatorPill(validator)}
											</span>
										{/each}
									</div>
								{:else}
									<span>-</span>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-mono-500">
								{field.defaultValue || '-'}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex items-center space-x-2">
									<span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
										{field.usedInApis.length}
									</span>
									<span class="text-sm text-mono-600">APIs</span>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<!-- Empty State -->
			{#if filteredFields.length === 0}
				<div class="flex flex-col items-center justify-center py-12 px-6">
					<i class="fa-solid fa-search text-4xl text-mono-300 mb-4"></i>
					<h3 class="text-lg font-medium text-mono-900 mb-2">No fields found</h3>
					<p class="text-sm text-mono-500">Try adjusting your search query</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Edit Field Drawer -->
	{#if drawerOpen && editedField}
		<div
			transition:slide={{ duration: 300, axis: 'x' }}
			class="w-96 bg-white border-l border-mono-200 flex flex-col overflow-hidden"
		>
			<div class="p-6 border-b border-mono-200">
				<div class="flex justify-between items-center">
					<h2 class="text-lg text-mono-800 font-semibold">Edit Field</h2>
					<button
						on:click={closeDrawer}
						class="text-mono-500 hover:text-mono-700 transition-colors"
						aria-label="Close drawer"
					>
						<i class="fa-solid fa-xmark"></i>
					</button>
				</div>
			</div>

			<div class="flex-1 overflow-auto p-6 space-y-4">
				{#if saveSuccess}
					<div class="bg-green-50 border border-green-200 rounded-md p-3 flex items-center space-x-2">
						<i class="fa-solid fa-check-circle text-green-600"></i>
						<span class="text-sm text-green-800">Changes saved successfully</span>
					</div>
				{/if}

				<div>
					<label class="block text-sm text-mono-700 mb-1 font-medium">
						Field Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						bind:value={editedField.name}
						class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {validationErrors.name ? 'border-red-500' : ''}"
					/>
					{#if validationErrors.name}
						<p class="text-xs text-red-500 mt-1">{validationErrors.name}</p>
					{/if}
				</div>

				<div>
					<label class="block text-sm text-mono-700 mb-1 font-medium">
						Type <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<select
							bind:value={editedField.type}
							class="w-full appearance-none px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent pr-8 {validationErrors.type ? 'border-red-500' : ''}"
						>
							<option value="str">str</option>
							<option value="str (email)">str (email)</option>
							<option value="str (password)">str (password)</option>
							<option value="int">int</option>
							<option value="float">float</option>
							<option value="bool">bool</option>
							<option value="datetime">datetime</option>
							<option value="uuid">uuid</option>
						</select>
						<div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
							<i class="fa-solid fa-chevron-down text-mono-400"></i>
						</div>
					</div>
					{#if validationErrors.type}
						<p class="text-xs text-red-500 mt-1">{validationErrors.type}</p>
					{/if}
				</div>

				<div>
					<label class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
					<textarea
						bind:value={editedField.description}
						rows="3"
						class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
					></textarea>
				</div>

				<div>
					<label class="block text-sm text-mono-700 mb-1 font-medium">Default Value</label>
					<input
						type="text"
						bind:value={editedField.defaultValue}
						placeholder="None"
						class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
					/>
				</div>

				<div>
					<div class="flex justify-between items-center mb-2">
						<label class="block text-sm text-mono-700 font-medium">Validators</label>
						<button
							type="button"
							on:click={addValidator}
							class="text-sm text-mono-600 hover:text-mono-900 flex items-center transition-colors"
						>
							<i class="fa-solid fa-plus mr-1"></i>
							<span>Add</span>
						</button>
					</div>
					<div class="space-y-2">
						{#each editedField.validators as validator, index}
							<div class="flex items-center space-x-2 p-2 bg-mono-50 rounded-md">
								<div class="relative flex-1">
									<select
										value={validator.name}
										on:change={(e) => updateValidatorName(index, e.currentTarget.value)}
										class="w-full appearance-none px-3 py-1.5 border border-mono-300 rounded-md text-sm pr-8 focus:ring-2 focus:ring-mono-400 focus:border-transparent"
									>
										{#each validators as v}
											<option value={v.name}>{v.name}</option>
										{/each}
									</select>
									<div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
										<i class="fa-solid fa-chevron-down text-mono-400 text-xs"></i>
									</div>
								</div>
								<button
									type="button"
									on:click={() => removeValidator(index)}
									class="text-mono-400 hover:text-mono-600 transition-colors"
									aria-label="Remove validator"
								>
									<i class="fa-solid fa-trash"></i>
								</button>
							</div>
						{/each}
						{#if editedField.validators.length === 0}
							<p class="text-sm text-mono-500 italic">No validators added</p>
						{/if}
					</div>
				</div>

				<div>
					<h3 class="text-sm text-mono-700 mb-2 font-medium">Used In APIs</h3>
					<div class="space-y-2">
						{#each editedField.usedInApis as api}
							<div class="flex items-center space-x-2 p-2 bg-mono-50 rounded-md">
								<i class="fa-solid fa-code text-mono-400"></i>
								<span class="text-sm text-mono-900">{api}</span>
							</div>
						{/each}
						{#if editedField.usedInApis.length === 0}
							<p class="text-sm text-mono-500 italic">Not used in any APIs</p>
						{/if}
					</div>
				</div>
			</div>

			<div class="p-6 border-t border-mono-200 space-y-2">
				<button
					type="button"
					on:click={handleSave}
					class="w-full px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 transition-colors font-medium"
				>
					Save Changes
				</button>
				<button
					type="button"
					on:click={handleCancel}
					class="w-full px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium"
				>
					Cancel
				</button>
				{#if !showDeleteConfirm}
					<button
						type="button"
						on:click={() => showDeleteConfirm = true}
						class="w-full px-4 py-2 bg-mono-100 text-mono-600 rounded-md hover:bg-mono-200 flex items-center justify-center transition-colors font-medium"
					>
						<i class="fa-solid fa-trash mr-2"></i>
						<span>Delete Field</span>
					</button>
				{:else}
					<div class="bg-red-50 border border-red-200 rounded-md p-3">
						<p class="text-sm text-red-800 mb-2">Are you sure you want to delete this field?</p>
						<div class="flex space-x-2">
							<button
								type="button"
								on:click={handleDelete}
								class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
							>
								Yes, Delete
							</button>
							<button
								type="button"
								on:click={() => showDeleteConfirm = false}
								class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 text-sm font-medium"
							>
								Cancel
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
