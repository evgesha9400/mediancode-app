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
    { label: 'Create Field', icon: 'fa-vector-square', href: '/fields' },
    { label: 'Create Object', icon: 'fa-cubes', href: '/objects' },
    { label: 'Create API', icon: 'fa-code', href: '/apis' },
  ];
</script>

{#if isEmpty}
  <div class="bg-mono-900 border-2 border-mono-700 p-6" data-testid="dashboard-onboarding">
    <div class="flex items-start space-x-4">
      <div class="w-10 h-10 border-2 border-green-400 flex items-center justify-center shrink-0">
        <i class="fa-solid fa-rocket text-green-400"></i>
      </div>
      <div>
        <h3 class="text-base font-semibold text-mono-100 mb-1">Get started with Median Code</h3>
        <p class="text-sm text-mono-400 mb-4">
          Define Fields, compose them into Objects, create APIs with endpoints, then generate production-ready FastAPI code.
        </p>
        <button
          onclick={() => goto('/fields')}
          class="px-4 py-2 bg-green-400 text-mono-950 font-bold text-sm tracking-wide hover:bg-green-300 transition-colors cursor-pointer"
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
        class="flex items-center space-x-2 px-4 py-2.5 bg-transparent border border-mono-600 text-sm font-medium text-mono-300 hover:bg-mono-800 hover:border-mono-400 transition-colors cursor-pointer"
      >
        <i class="fa-solid {action.icon} text-mono-400"></i>
        <span>{action.label}</span>
      </button>
    {/each}
  </div>
{/if}
