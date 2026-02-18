<script lang="ts">
  import { typesBaseStore } from '$lib/stores/types';
  import { fieldsStore } from '$lib/stores/fields';
  import { fieldConstraintsStore } from '$lib/stores/fieldConstraints';
  import { objectsStore } from '$lib/stores/objects';
  import { apisStore } from '$lib/stores/apis';
  import { clerkState } from '$lib/clerk';
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';
  import { StatCard } from '$lib/components';

  const isBeta = true;

  let totalTypes = $derived($typesBaseStore.length);
  let totalFields = $derived($fieldsStore.length);
  let totalFieldConstraints = $derived($fieldConstraintsStore.length);
  let totalObjects = $derived($objectsStore.length);
  let totalApis = $derived($apisStore.length);
  let userName = $derived($clerkState.user?.firstName || $clerkState.user?.fullName || 'Developer');
  let errors = $derived($storeLoadingState.storeErrors);

  function hasError(storeName: string): boolean {
    return errors.includes(storeName);
  }

  function handleRetry() {
    reloadStores();
  }
</script>

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
        <div class="w-40"><StatCard title="Types" value={totalTypes} icon="fa-shapes" error={hasError('Types')} onRetry={handleRetry} /></div>
        <div class="w-40"><StatCard title="Field Constraints" value={totalFieldConstraints} icon="fa-check-circle" error={hasError('Field Constraints')} onRetry={handleRetry} /></div>
        <div class="w-40"><StatCard title="Fields" value={totalFields} icon="fa-table-list" error={hasError('Fields')} onRetry={handleRetry} /></div>
        <div class="w-40"><StatCard title="Objects" value={totalObjects} icon="fa-cubes" error={hasError('Objects')} onRetry={handleRetry} /></div>
      </div>
    </section>

    <!-- APIs Section -->
    <section>
      <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">APIs</h2>
      <div class="flex flex-wrap gap-6">
        <div class="w-40"><StatCard title="Generated APIs" value={totalApis} icon="fa-code" error={hasError('APIs')} onRetry={handleRetry} /></div>
      </div>
    </section>

    <!-- Account Section -->
    <section>
      <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Account</h2>
      <div class="flex flex-wrap gap-6">
        <div class="w-40"><StatCard title="Credits Available" value={isBeta ? '∞' : 0} icon="fa-coins" trend={isBeta ? 'Unlimited during beta' : undefined} /></div>
        <div class="w-40"><StatCard title="Credits Used" value={isBeta ? '—' : 0} icon="fa-chart-line" /></div>
      </div>
    </section>
  </div>
