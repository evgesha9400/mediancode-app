<script lang="ts">
  import { typesBaseStore } from '$lib/stores/types';
  import { fieldsStore } from '$lib/stores/fields';
  import { fieldConstraintsStore } from '$lib/stores/fieldConstraints';
  import { objectsStore } from '$lib/stores/objects';
  import { apisStore, endpointsStore } from '$lib/stores/apis';
  import { clerkState } from '$lib/clerk';
  import { storeLoadingState, reloadStores, STORE_NAMES } from '$lib/stores/loader';
  import { MainColumnFrame, PageHeader, StatCard } from '$lib/components';
  import { QuickActions, ProjectChecklist, ApiReadinessCard } from '$lib/components/dashboard';
  import { GenerateModal } from '$lib/components/api-generator';
  import { dashboardTextPrimary } from '$lib/ui/classes';

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

<MainColumnFrame bodyClass="p-6 space-y-6">
  {#snippet header()}
    <PageHeader
      title="Dashboard"
      description={`Welcome back, ${userName}! Here's your overview`}
    />
  {/snippet}

  <!-- Quick Actions / Onboarding -->
  <section>
    <QuickActions {hasFields} {hasObjects} {hasApis} />
  </section>

  <!--
    Mobile: Checklist, Components, Your APIs, Account.
    lg+: Checklist full width; Components + Your APIs start on same row (aligned headers);
         APIs spans height of Components + Account in the right column.
  -->
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto]">
    <div class="lg:col-span-3 lg:row-start-1">
      <ProjectChecklist {hasFields} {hasObjects} {hasApis} {hasConfiguredEndpoint} />
    </div>

    <section class="dashboard-components min-w-0 lg:col-start-1 lg:row-start-2">
      <div class="flex items-center mb-3 h-[24px]">
        <h2 class="text-xs uppercase tracking-wider font-inter font-medium {dashboardTextPrimary}">Components</h2>
      </div>
      <div class="dashboard-components-stat-grid">
        <StatCard title="Types" value={totalTypes} icon="fa-shapes" error={hasError(STORE_NAMES.TYPES)} onRetry={handleRetry} />
        <StatCard title="Constraints" value={totalFieldConstraints} icon="fa-shield-halved" error={hasError(STORE_NAMES.FIELD_CONSTRAINTS)} onRetry={handleRetry} />
        <StatCard title="Fields" value={totalFields} icon="fa-vector-square" error={hasError(STORE_NAMES.FIELDS)} onRetry={handleRetry} />
        <StatCard title="Objects" value={totalObjects} icon="fa-cubes" error={hasError(STORE_NAMES.OBJECTS)} onRetry={handleRetry} />
      </div>
    </section>

    <div class="lg:col-start-2 lg:col-span-2 lg:row-start-2 lg:row-span-2">
      <section class="flex flex-col">
        <div class="flex items-center mb-3 h-[24px]">
          <h2 class="text-xs uppercase tracking-wider font-inter font-medium {dashboardTextPrimary}">Your APIs</h2>
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
          <div class="bg-mono-900/50 backdrop-blur-sm/30 border border-mono-800/80 rounded-2xl p-8 text-center shadow-lg">
            <i class="fa-solid fa-code text-mono-600 text-3xl mb-3 block"></i>
            <p class="text-sm text-mono-400 font-inter">No APIs yet. Create your first API to get started.</p>
          </div>
        {/if}
      </section>
    </div>

    <section class="lg:col-start-1 lg:row-start-3">
      <div class="flex items-center mb-3 h-[24px]">
        <h2 class="text-xs uppercase tracking-wider font-inter font-medium {dashboardTextPrimary}">Account</h2>
      </div>
      <StatCard title="Generations" value="∞" icon="fa-bolt" trend="Unlimited during beta" />
    </section>
  </div>
</MainColumnFrame>

<!-- Generate Modal -->
<GenerateModal
  open={generateModalOpen}
  apiId={generateApiId}
  apiTitle={generateApiTitle}
  onClose={() => generateModalOpen = false}
/>

<style>
  /* One column until the section is wide enough for two readable stat cards (not viewport — fixes narrow lg: sidebar). */
  .dashboard-components {
    container-type: inline-size;
  }
  .dashboard-components-stat-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  @container (min-width: 32rem) {
    .dashboard-components-stat-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
