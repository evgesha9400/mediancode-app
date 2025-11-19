<script lang="ts">
	import { validatorsStore, searchValidators, getTotalValidatorCount, type Validator } from '$lib/stores/validators';
	import { clerkState, signOut } from '$lib/clerk';
	import { goto } from '$app/navigation';
	import { slide, fade } from 'svelte/transition';

	let searchQuery = '';
	let selectedValidator: Validator | null = null;
	let drawerOpen = false;

	$: filteredValidators = searchValidators(searchQuery);
	$: totalCount = getTotalValidatorCount();

	function selectValidator(validator: Validator) {
		selectedValidator = validator;
		drawerOpen = true;
	}

	function closeDrawer() {
		drawerOpen = false;
		setTimeout(() => {
			selectedValidator = null;
		}, 300);
	}

	function isSelected(validator: Validator): boolean {
		return selectedValidator?.name === validator.name;
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
						class="flex items-center space-x-2 px-2 py-1.5 rounded-md bg-mono-800 cursor-pointer"
					>
						<i class="fa-solid fa-check-circle w-5"></i>
						<span>Validators</span>
					</a>
				</li>
				<li>
					<a
						href="/field-registry"
						class="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-mono-800 cursor-pointer"
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
				<h1 class="text-xl text-mono-800 font-semibold">Validators Library</h1>
				<div class="flex items-center space-x-4">
					<button
						type="button"
						disabled
						class="px-4 py-2 bg-mono-400 text-white rounded-md flex items-center space-x-2 cursor-not-allowed opacity-60"
					>
						<i class="fa-solid fa-plus"></i>
						<span>Add Validator</span>
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
							placeholder="Search validators..."
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
					<span>{filteredValidators.length} validator{filteredValidators.length !== 1 ? 's' : ''}</span>
				</div>
			</div>
		</div>

		<!-- Table Container -->
		<div class="flex-1 overflow-auto">
			{#if filteredValidators.length > 0}
				<table class="min-w-full bg-white">
					<thead class="bg-mono-50 sticky top-0">
						<tr>
							<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
								<div class="flex items-center space-x-1">
									<span>Validator Name</span>
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
									<span>Category</span>
									<i class="fa-solid fa-sort"></i>
								</div>
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
								<div class="flex items-center space-x-1">
									<span>Description</span>
								</div>
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
								<div class="flex items-center space-x-1">
									<span>Used In Fields</span>
									<i class="fa-solid fa-sort"></i>
								</div>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-mono-200">
						{#each filteredValidators as validator}
							<tr
								on:click={() => selectValidator(validator)}
								class="cursor-pointer transition-colors {isSelected(validator) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
							>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-mono-900 font-medium">{validator.name}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white capitalize">
										{validator.category}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="px-2 py-1 text-xs rounded-full {validator.type === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
										{validator.type}
									</span>
								</td>
								<td class="px-6 py-4 text-sm text-mono-500">
									{validator.description.split('.')[0]}.
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center space-x-2">
										<span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
											{validator.usedInFields}
										</span>
										<span class="text-sm text-mono-600">fields</span>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<!-- Empty State -->
				<div class="flex flex-col items-center justify-center py-12 px-6">
					<i class="fa-solid fa-search text-4xl text-mono-300 mb-4"></i>
					<h3 class="text-lg font-medium text-mono-900 mb-2">No validators found</h3>
					<p class="text-sm text-mono-500">Try adjusting your search query</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Validator Details Drawer -->
	{#if drawerOpen && selectedValidator}
		<div
			transition:slide={{ duration: 300, axis: 'x' }}
			class="w-96 bg-white border-l border-mono-200 overflow-auto flex flex-col"
		>
			<div class="p-6 border-b border-mono-200 flex items-center justify-between">
				<h2 class="text-lg text-mono-800 font-semibold">Validator Details</h2>
				<button
					on:click={closeDrawer}
					class="text-mono-500 hover:text-mono-700 transition-colors"
					aria-label="Close drawer"
				>
					<i class="fa-solid fa-xmark"></i>
				</button>
			</div>

			<div class="flex-1 overflow-auto p-6">
				<div class="space-y-6">
					<div>
						<h3 class="text-sm text-mono-500 mb-1 font-medium">Validator Name</h3>
						<p class="text-mono-900">{selectedValidator.name}</p>
					</div>

					<div>
						<h3 class="text-sm text-mono-500 mb-1 font-medium">Type</h3>
						<span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white capitalize">
							{selectedValidator.category}
						</span>
					</div>

					<div>
						<h3 class="text-sm text-mono-500 mb-1 font-medium">Category</h3>
						<span class="px-2 py-1 text-xs rounded-full {selectedValidator.type === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
							{selectedValidator.type}
						</span>
					</div>

					<div>
						<h3 class="text-sm text-mono-500 mb-1 font-medium">Description</h3>
						<p class="text-mono-900">{selectedValidator.description}</p>
					</div>

					<div>
						<h3 class="text-sm text-mono-500 mb-1 font-medium">Parameter Type</h3>
						<p class="text-mono-900">{selectedValidator.parameterType}</p>
					</div>

					<div>
						<h3 class="text-sm text-mono-500 mb-1 font-medium">Example Usage</h3>
						<div class="bg-mono-50 border border-mono-200 rounded-md p-3">
							<code class="text-sm text-mono-800 whitespace-pre-wrap font-mono">
								{selectedValidator.exampleUsage}
							</code>
						</div>
					</div>

					<div>
						<h3 class="text-sm text-mono-500 mb-1 font-medium">Pydantic Documentation</h3>
						<a
							href={selectedValidator.pydanticDocsUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-sm text-mono-900 underline hover:text-mono-600 transition-colors"
						>
							View in Pydantic Docs <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
						</a>
					</div>

					<div>
						<h3 class="text-sm text-mono-500 mb-2 font-medium">
							Used In Fields ({selectedValidator.usedInFields})
						</h3>
						<div class="space-y-2">
							{#each selectedValidator.fieldsUsingValidator as field}
								<div class="flex items-center justify-between p-3 bg-mono-50 rounded-md hover:bg-mono-100 cursor-pointer transition-colors">
									<div class="flex items-center space-x-2">
										<i class="fa-solid fa-table-list text-mono-400"></i>
										<span class="text-sm text-mono-900">{field.name}</span>
									</div>
									<span class="text-xs text-mono-500 bg-mono-200 px-2 py-1 rounded">
										{field.model}
									</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
