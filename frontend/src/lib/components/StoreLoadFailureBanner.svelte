<script module lang="ts">
  export interface StoreLoadFailureBannerProps {
    errors: readonly string[];
    onRetry: () => void | Promise<void>;
  }
</script>

<script lang="ts">
  interface Props extends StoreLoadFailureBannerProps {}

  let { errors, onRetry }: Props = $props();

  let failedResources = $derived(errors.join(', '));
</script>

<div
  role="alert"
  aria-live="assertive"
  data-testid="store-load-failure-banner"
  class="mx-6 mt-4 flex flex-col gap-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-red-100 sm:flex-row sm:items-center sm:justify-between"
>
  <div class="flex min-w-0 items-start gap-3">
    <i class="fa-solid fa-circle-exclamation mt-0.5 shrink-0 text-red-400"></i>
    <div class="min-w-0">
      <p class="font-inter text-sm font-semibold">Some server data could not be loaded</p>
      <p class="mt-1 font-inter text-sm text-red-100/80">
        Failed: {failedResources}. Displayed information may be incomplete.
      </p>
    </div>
  </div>
  <button
    type="button"
    onclick={onRetry}
    class="shrink-0 self-start rounded-lg border border-red-300/40 px-3 py-1.5 font-inter text-sm font-medium text-red-100 transition-colors hover:bg-red-400/10 sm:self-auto"
  >
    Retry
  </button>
</div>
