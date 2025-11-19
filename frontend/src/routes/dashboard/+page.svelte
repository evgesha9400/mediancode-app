<script lang="ts">
  import { fieldsStore, getTotalFieldCount } from '$lib/stores/fields';
  import { validatorsStore, getTotalValidatorCount } from '$lib/stores/validators';
  import { clerkState } from '$lib/clerk';
  import DashboardLayout from '$lib/components/DashboardLayout.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import ActivityItem from '$lib/components/ActivityItem.svelte';

  $: totalFields = getTotalFieldCount();
  $: totalValidators = getTotalValidatorCount();
  $: userName = $clerkState.user?.firstName || $clerkState.user?.fullName || 'Developer';

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

<DashboardLayout>
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
      <StatCard title="Total Fields" value={totalFields} icon="fa-table-list" trend="+12%" />
      <StatCard title="Active APIs" value={18} icon="fa-code" trend="+8%" />
      <StatCard title="Validators" value={totalValidators} icon="fa-check-circle" trend="+5%" />
      <StatCard title="Credits Available" value={2450} icon="fa-coins" />
      <StatCard title="Credits Used" value={1550} icon="fa-chart-line" />
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
          <ActivityItem
            icon={activity.icon}
            title={activity.title}
            name={activity.name}
            description={activity.description}
            time={activity.time}
            showBorder={index < recentActivities.length - 1}
          />
        {/each}
      </div>
    </div>
  </div>
</DashboardLayout>
