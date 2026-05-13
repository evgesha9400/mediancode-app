<script module lang="ts">
  export interface QuickActionsProps {
    hasFields: boolean;
    hasObjects: boolean;
    hasApis: boolean;
  }
</script>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { accentIconTile, btnCtaGlow, cardOnboardingShell } from '$lib/ui/classes';

  interface Props extends QuickActionsProps {}

  let { hasFields, hasObjects, hasApis }: Props = $props();

  let isEmpty = $derived(!hasFields && !hasObjects && !hasApis);
</script>

{#if isEmpty}
  <div class={cardOnboardingShell} data-testid="dashboard-onboarding">
    <div class="flex items-start space-x-5">
      <div class="w-12 h-12 shrink-0 {accentIconTile}">
        <i class="fa-solid fa-rocket text-xl"></i>
      </div>
      <div>
        <h3 class="text-lg font-bold font-inter text-fg mb-1">Get started with Median Code</h3>
        <p class="text-sm text-fg-muted mb-5 font-inter leading-relaxed">
          Define Fields, compose them into Objects, create APIs with endpoints, then generate production-ready FastAPI code.
        </p>
        <button
          onclick={() => goto('/fields')}
          class={btnCtaGlow}
          data-testid="onboarding-start-btn"
        >
          Create your first Field
        </button>
      </div>
    </div>
  </div>
{/if}
