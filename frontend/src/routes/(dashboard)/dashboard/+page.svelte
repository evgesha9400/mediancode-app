<script lang="ts">
  import { typesBaseStore } from '$lib/stores/types';
  import { fieldsStore } from '$lib/stores/fields';
  import { fieldConstraintsStore } from '$lib/stores/fieldConstraints';
  import { objectsStore } from '$lib/stores/objects';
  import { apisStore, endpointsStore } from '$lib/stores/apis';
  import { clerkState } from '$lib/clerk';
  import { storeLoadingState, reloadStores, STORE_NAMES } from '$lib/stores/loader';
  import { StatCard } from '$lib/components';
  import { QuickActions, ProjectChecklist, ApiReadinessCard } from '$lib/components/dashboard';
  import { GenerateModal } from '$lib/components/api-generator';

  let totalTypes = $derived($typesBaseStore.length);
  let totalFields = $derived($fieldsStore.length);
  let totalFieldConstraints = $derived($fieldConstraintsStore.length);
  let totalObjects = $derived($objectsStore.length);
  let userName = $derived($clerkState.user?.firstName || $clerkState.user?.fullName || 'Developer');
  let errors = $derived($storeLoadingState.storeErrors);

  // Quick actions / checklist flags
  let hasFields = $derived($fieldsStore.length > 0);
  let hasObjects = $derived($objectsStore.length > 0);
  let hasApis = $derived($apisStore.length > 0);
  let hasConfiguredEndpoint = $derived(
    $endpointsStore.some(e => !!e.objectId)
  );

  // API readiness computation
  let apiReadiness = $derived(
    $apisStore
      .map(api => {
        const endpoints = $endpointsStore.filter(e => e.apiId === api.id);
        const readyEndpoints = endpoints.filter(e => e.objectId);
        let status: 'ready' | 'needs-endpoints' | 'incomplete';
        if (endpoints.length === 0) {
          status = 'needs-endpoints';
        } else if (readyEndpoints.length > 0) {
          status = 'ready';
        } else {
          status = 'incomplete';
        }
        return { api, status, endpointCount: endpoints.length, readyEndpointCount: readyEndpoints.length };
      })
      .sort((a, b) => new Date(b.api.updatedAt).getTime() - new Date(a.api.updatedAt).getTime())
      .slice(0, 5)
  );

  // Generate modal state
  let generateModalOpen = $state(false);
  let generateApiId = $state('');
  let generateApiTitle = $state('');

  function openGenerateModal(apiId: string, apiTitle: string) {
    generateApiId = apiId;
    generateApiTitle = apiTitle;
    generateModalOpen = true;
  }

  function hasError(storeName: typeof STORE_NAMES[keyof typeof STORE_NAMES]): boolean {
    return errors.includes(storeName);
  }

  function handleRetry() {
    reloadStores();
  }
</script>

<!-- Header -->
<div class="bg-mono-950 border-b-2 border-mono-700 py-4 px-6">
  <div>
    <h1 class="text-2xl text-mono-100 font-semibold">Dashboard</h1>
    <p class="text-sm text-mono-400 mt-1">Welcome back, {userName}! Here's your overview</p>
  </div>
</div>

<!-- Main Dashboard Content -->
<div class="flex-1 overflow-auto p-6 space-y-6">
  <!-- Quick Actions / Onboarding -->
  <section>
    <QuickActions {hasFields} {hasObjects} {hasApis} />
  </section>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left column: Checklist + Stats -->
    <div class="lg:col-span-1 space-y-6">
      <ProjectChecklist {hasFields} {hasObjects} {hasApis} {hasConfiguredEndpoint} />

      <!-- Entity Stats -->
      <section>
        <div class="flex items-center mb-3 h-[24px]">
          <h2 class="text-xs uppercase tracking-wider text-mono-500 font-medium">Components</h2>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <StatCard title="Types" value={totalTypes} icon="fa-shapes" error={hasError(STORE_NAMES.TYPES)} onRetry={handleRetry} />
          <StatCard title="Constraints" value={totalFieldConstraints} icon="fa-shield-halved" error={hasError(STORE_NAMES.FIELD_CONSTRAINTS)} onRetry={handleRetry} />
          <StatCard title="Fields" value={totalFields} icon="fa-vector-square" error={hasError(STORE_NAMES.FIELDS)} onRetry={handleRetry} />
          <StatCard title="Objects" value={totalObjects} icon="fa-cubes" error={hasError(STORE_NAMES.OBJECTS)} onRetry={handleRetry} />
        </div>
      </section>

      <!-- Account -->
      <section>
        <div class="flex items-center mb-3 h-[24px]">
          <h2 class="text-xs uppercase tracking-wider text-mono-500 font-medium">Account</h2>
        </div>
        <StatCard title="Generations" value="∞" icon="fa-bolt" trend="Unlimited during beta" />
      </section>
    </div>

    <!-- Right column: API Readiness -->
    <div class="lg:col-span-2">
      <section class="flex flex-col">
        <div class="flex items-center mb-3 h-[24px]">
          <h2 class="text-xs uppercase tracking-wider text-mono-500 font-medium">Your APIs</h2>
        </div>
        {#if apiReadiness.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each apiReadiness as item}
              <ApiReadinessCard
                apiId={item.api.id}
                title={item.api.title}
                version={item.api.version}
                endpointCount={item.endpointCount}
                readyEndpointCount={item.readyEndpointCount}
                status={item.status}
                onGenerate={() => openGenerateModal(item.api.id, item.api.title)}
              />
            {/each}
          </div>
        {:else}
          <div class="bg-mono-900 border-2 border-mono-700 p-6 text-center">
            <i class="fa-solid fa-code text-mono-600 text-2xl mb-2 block"></i>
            <p class="text-sm text-mono-400">No APIs yet. Create your first API to get started.</p>
          </div>
        {/if}
      </section>
    </div>
  </div>
</div>

<!-- Generate Modal -->
<GenerateModal
  open={generateModalOpen}
  apiId={generateApiId}
  apiTitle={generateApiTitle}
  onClose={() => generateModalOpen = false}
/>
