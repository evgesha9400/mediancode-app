<script module lang="ts">
  export interface QuickActionsProps {
    hasFields: boolean;
    hasObjects: boolean;
    hasApis: boolean;
  }
</script>

<script lang="ts">
  import { goto } from '$app/navigation';

  interface Props extends QuickActionsProps {}

  let { hasFields, hasObjects, hasApis }: Props = $props();

  let isEmpty = $derived(!hasFields && !hasObjects && !hasApis);

  const actions = [
    { label: 'Create Field', icon: 'fa-table-list', href: '/fields' },
    { label: 'Create Object', icon: 'fa-cubes', href: '/objects' },
    { label: 'Create API', icon: 'fa-code', href: '/apis' },
  ];
</script>

{#if isEmpty}
  <div class="bg-white rounded-lg border border-mono-200 p-6" data-testid="dashboard-onboarding">
    <div class="flex items-start space-x-4">
      <div class="w-10 h-10 bg-mono-100 rounded-lg flex items-center justify-center shrink-0">
        <i class="fa-solid fa-rocket text-mono-700"></i>
      </div>
      <div>
        <h3 class="text-base font-semibold text-mono-900 mb-1">Get started with Median Code</h3>
        <p class="text-sm text-mono-500 mb-4">
          Define Fields, compose them into Objects, create APIs with endpoints, then generate production-ready FastAPI code.
        </p>
        <button
          onclick={() => goto('/fields')}
          class="px-4 py-2 bg-mono-900 text-white rounded-md text-sm font-medium hover:bg-mono-800 transition-colors cursor-pointer"
          data-testid="onboarding-start-btn"
        >
          Create your first Field
        </button>
      </div>
    </div>
  </div>
{:else}
  <div class="flex flex-wrap gap-3" data-testid="dashboard-quick-actions">
    {#each actions as action}
      <button
        onclick={() => goto(action.href)}
        class="flex items-center space-x-2 px-4 py-2.5 bg-white border border-mono-200 rounded-lg text-sm font-medium text-mono-700 hover:bg-mono-50 hover:border-mono-300 transition-colors cursor-pointer"
      >
        <i class="fa-solid {action.icon} text-mono-400"></i>
        <span>{action.label}</span>
      </button>
    {/each}
  </div>
{/if}
