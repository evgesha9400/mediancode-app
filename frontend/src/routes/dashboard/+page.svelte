<script lang="ts">
  import { fieldsStore, getTotalFieldCount, getTotalApiCount } from '$lib/stores/fields';
  import { validatorsStore, getTotalValidatorCount } from '$lib/stores/validators';
  import { clerkState } from '$lib/clerk';
  import { DashboardLayout, StatCard } from '$lib/components';

  $: totalFields = getTotalFieldCount();
  $: totalValidators = getTotalValidatorCount();
  $: totalApis = getTotalApiCount();
  $: userName = $clerkState.user?.firstName || $clerkState.user?.fullName || 'Developer';
</script>

<DashboardLayout>
  <!-- Header -->
  <div class="bg-white border-b border-mono-200 py-4 px-6">
    <div>
      <h1 class="text-2xl text-mono-800 font-semibold">Dashboard</h1>
      <p class="text-sm text-mono-500 mt-1">Welcome back, {userName}! Here's your overview</p>
    </div>
  </div>

  <!-- Main Dashboard Content -->
  <div class="flex-1 overflow-auto p-6">
    <!-- Stat Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard title="Total Fields" value={totalFields} icon="fa-table-list" trend="+12%" />
      <StatCard title="Active APIs" value={totalApis} icon="fa-code" trend="+8%" />
      <StatCard title="Validators" value={totalValidators} icon="fa-check-circle" trend="+5%" />
      <StatCard title="Credits Available" value={2450} icon="fa-coins" />
      <StatCard title="Credits Used" value={1550} icon="fa-chart-line" />
    </div>
  </div>
</DashboardLayout>
