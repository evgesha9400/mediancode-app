<script lang="ts">
  import { getTotalFieldCount, getTotalApiCount } from '$lib/stores/fields';
  import { getTotalValidatorCount } from '$lib/stores/validators';
  import { getTotalTypeCount } from '$lib/stores/types';
  import { clerkState } from '$lib/clerk';
  import { DashboardLayout, StatCard } from '$lib/components';

  $: totalTypes = getTotalTypeCount();
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
  <div class="flex-1 overflow-auto p-6 space-y-8">
    <!-- Core Components Section -->
    <section>
      <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Core Components</h2>
      <div class="flex flex-wrap gap-6">
        <div class="w-40"><StatCard title="Types" value={totalTypes} icon="fa-shapes" /></div>
        <div class="w-40"><StatCard title="Validators" value={totalValidators} icon="fa-check-circle" /></div>
        <div class="w-40"><StatCard title="Fields" value={totalFields} icon="fa-table-list" /></div>
      </div>
    </section>

    <!-- APIs Section -->
    <section>
      <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">APIs</h2>
      <div class="flex flex-wrap gap-6">
        <div class="w-40"><StatCard title="Generated APIs" value={totalApis} icon="fa-code" /></div>
      </div>
    </section>

    <!-- Account Section -->
    <section>
      <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Account</h2>
      <div class="flex flex-wrap gap-6">
        <div class="w-40"><StatCard title="Credits Available" value={2450} icon="fa-coins" /></div>
        <div class="w-40"><StatCard title="Credits Used" value={1550} icon="fa-chart-line" /></div>
      </div>
    </section>
  </div>
</DashboardLayout>
