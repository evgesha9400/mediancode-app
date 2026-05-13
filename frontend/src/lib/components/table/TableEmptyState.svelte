<!--
  TableEmptyState - Smart empty state that switches between error and no-results

  Checks the store loader for errors on a specific store key and renders
  either an error state with retry button, or a no-results state.

  @component
  @example
  <TableEmptyState
    entityName="fields"
    storeKey="FIELDS"
    noResultsMessage="Try adjusting your search query"
  />
-->
<script module lang="ts">
  export interface TableEmptyStateProps {
    /**
     * Human-readable entity name displayed in titles and messages
     */
    entityName: string;

    /**
     * Store key to check against storeLoadingState.storeErrors
     * Should match a value from STORE_NAMES constant
     */
    storeKey: string;

    /**
     * Custom message for the no-results state
     * @default 'Try adjusting your search query'
     */
    noResultsMessage?: string;
  }
</script>

<script lang="ts">
  import { EmptyState } from '$lib/components/table';
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';

  interface Props extends TableEmptyStateProps {}

  let {
    entityName,
    storeKey,
    noResultsMessage = 'Try adjusting your search query'
  }: Props = $props();

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes(storeKey));
</script>

{#if hasLoadError}
  <EmptyState
    icon="fa-circle-exclamation"
    variant="error"
    title="Failed to load {entityName}"
    message="Something went wrong while fetching {entityName} data"
    actionLabel="Retry"
    onAction={reloadStores}
  />
{:else}
  <EmptyState
    title="No {entityName} found"
    message={noResultsMessage}
  />
{/if}
