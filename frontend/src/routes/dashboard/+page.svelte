<script lang="ts">
	import { fieldsStore, getTotalFieldCount } from '$lib/stores/fields';
	import { validatorsStore, getTotalValidatorCount } from '$lib/stores/validators';
	import { clerkState, signOut } from '$lib/clerk';
	import { goto } from '$app/navigation';

	$: totalFields = getTotalFieldCount();
	$: totalValidators = getTotalValidatorCount();
	$: userName = $clerkState.user?.firstName || $clerkState.user?.fullName || 'Developer';

	async function handleSignOut() {
		await signOut();
		goto('/signin');
	}

	const recentActivities = [
		{
			icon: 'fa-plus',
			title: 'New field created',
			name: 'email_verified',
			description: 'Added to Field Registry with email validation',
			time: '2 hours ago'
		},
		{
			icon: 'fa-code',
			title: 'API updated',
			name: 'User Authentication',
			description: 'Modified endpoint parameters and response structure',
			time: '5 hours ago'
		},
		{
			icon: 'fa-check',
			title: 'Validator added',
			name: 'phone_number',
			description: 'International phone number format validation',
			time: '1 day ago'
		},
		{
			icon: 'fa-pencil',
			title: 'Field updated',
			name: 'username',
			description: 'Changed max_length validator from 30 to 50',
			time: '2 days ago'
		},
		{
			icon: 'fa-code',
			title: 'New API created',
			name: 'Product Management',
			description: 'Initialized with 8 fields from registry',
			time: '3 days ago'
		}
	];
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
						class="flex items-center space-x-2 px-2 py-1.5 rounded-md bg-mono-800 cursor-pointer"
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
				<div>
					<h1 class="text-2xl text-mono-800 font-semibold">Dashboard</h1>
					<p class="text-sm text-mono-500 mt-1">Welcome back, {userName}! Here's your overview</p>
				</div>
				<div class="flex items-center space-x-3">
					<button
						type="button"
						disabled
						class="px-4 py-2 bg-mono-100 text-mono-700 rounded-md flex items-center space-x-2 cursor-not-allowed opacity-60"
					>
						<i class="fa-solid fa-calendar"></i>
						<span>Last 30 days</span>
						<i class="fa-solid fa-chevron-down"></i>
					</button>
				</div>
			</div>
		</div>

		<!-- Main Dashboard Content -->
		<div class="flex-1 overflow-auto p-6">
			<!-- Stat Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
				<!-- Total Fields Card -->
				<div class="bg-white rounded-lg border border-mono-200 p-6">
					<div class="flex items-center justify-between mb-4">
						<div class="w-12 h-12 bg-mono-100 rounded-lg flex items-center justify-center">
							<i class="fa-solid fa-table-list text-mono-700 text-xl"></i>
						</div>
						<span class="text-xs text-mono-500">+12%</span>
					</div>
					<div class="text-2xl text-mono-900 font-semibold mb-1">{totalFields}</div>
					<div class="text-sm text-mono-500">Total Fields</div>
				</div>

				<!-- Active APIs Card -->
				<div class="bg-white rounded-lg border border-mono-200 p-6">
					<div class="flex items-center justify-between mb-4">
						<div class="w-12 h-12 bg-mono-100 rounded-lg flex items-center justify-center">
							<i class="fa-solid fa-code text-mono-700 text-xl"></i>
						</div>
						<span class="text-xs text-mono-500">+8%</span>
					</div>
					<div class="text-2xl text-mono-900 font-semibold mb-1">18</div>
					<div class="text-sm text-mono-500">Active APIs</div>
				</div>

				<!-- Validators Card -->
				<div class="bg-white rounded-lg border border-mono-200 p-6">
					<div class="flex items-center justify-between mb-4">
						<div class="w-12 h-12 bg-mono-100 rounded-lg flex items-center justify-center">
							<i class="fa-solid fa-check-circle text-mono-700 text-xl"></i>
						</div>
						<span class="text-xs text-mono-500">+5%</span>
					</div>
					<div class="text-2xl text-mono-900 font-semibold mb-1">{totalValidators}</div>
					<div class="text-sm text-mono-500">Validators</div>
				</div>

				<!-- Credits Available Card -->
				<div class="bg-white rounded-lg border border-mono-200 p-6">
					<div class="flex items-center justify-between mb-4">
						<div class="w-12 h-12 bg-mono-100 rounded-lg flex items-center justify-center">
							<i class="fa-solid fa-coins text-mono-700 text-xl"></i>
						</div>
					</div>
					<div class="text-2xl text-mono-900 font-semibold mb-1">2,450</div>
					<div class="text-sm text-mono-500">Credits Available</div>
				</div>

				<!-- Credits Used Card -->
				<div class="bg-white rounded-lg border border-mono-200 p-6">
					<div class="flex items-center justify-between mb-4">
						<div class="w-12 h-12 bg-mono-100 rounded-lg flex items-center justify-center">
							<i class="fa-solid fa-chart-line text-mono-700 text-xl"></i>
						</div>
					</div>
					<div class="text-2xl text-mono-900 font-semibold mb-1">1,550</div>
					<div class="text-sm text-mono-500">Credits Used</div>
				</div>
			</div>

			<!-- Recent Activity Card -->
			<div class="bg-white rounded-lg border border-mono-200 p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-lg text-mono-800 font-semibold">Recent Activity</h2>
					<button
						type="button"
						disabled
						class="text-sm text-mono-600 cursor-not-allowed opacity-60"
					>
						View all
					</button>
				</div>
				<div class="space-y-4">
					{#each recentActivities as activity, index}
						<div class="flex items-start space-x-4 {index < recentActivities.length - 1 ? 'pb-4 border-b border-mono-100' : ''}">
							<div class="w-10 h-10 bg-mono-100 rounded-full flex items-center justify-center flex-shrink-0">
								<i class="fa-solid {activity.icon} text-mono-600"></i>
							</div>
							<div class="flex-1">
								<div class="flex items-center justify-between mb-1">
									<p class="text-sm text-mono-900">
										{activity.title}: <span class="font-medium">{activity.name}</span>
									</p>
									<span class="text-xs text-mono-500">{activity.time}</span>
								</div>
								<p class="text-xs text-mono-500">{activity.description}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
