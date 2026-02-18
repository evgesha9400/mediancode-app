<!--
  EmptyState - Display message when table or list is empty

  Shows an icon, title, and message when there are no items to display.
  Commonly used within table empty slots or filtered results with no matches.

  @component
  @example
  <EmptyState
    icon="fa-search"
    title="No results found"
    message="Try adjusting your search criteria"
  />
-->
<script module lang="ts">
  export interface EmptyStateProps {
    /**
     * Font Awesome icon class to display
     * @default 'fa-search'
     */
    icon?: string;

    /**
     * Title text to display
     */
    title: string;

    /**
     * Descriptive message to display below the title
     */
    message: string;

    /**
     * Optional action button label
     */
    actionLabel?: string;

    /**
     * Optional action button callback
     */
    onAction?: () => void;

    /**
     * Visual variant - 'error' colors the icon and title red
     * @default 'default'
     */
    variant?: 'default' | 'error';
  }
</script>

<script lang="ts">
  import { EMPTY_STATE_ID } from '$lib/utils/testIds';

  interface Props extends EmptyStateProps {}

  let { icon = 'fa-search', title, message, actionLabel, onAction, variant = 'default' }: Props = $props();
</script>

<div data-testid={EMPTY_STATE_ID} class="flex flex-col items-center justify-center py-12 px-6">
  <i class="fa-solid {icon} text-4xl {variant === 'error' ? 'text-red-400' : 'text-mono-300'} mb-4"></i>
  <h3 class="text-lg font-medium {variant === 'error' ? 'text-red-600' : 'text-mono-900'} mb-2">{title}</h3>
  <p class="text-sm text-mono-500">{message}</p>
  {#if actionLabel && onAction}
    <button
      onclick={onAction}
      class="mt-4 px-4 py-2 text-sm bg-mono-900 text-white rounded-md hover:bg-mono-800 transition-colors"
    >
      {actionLabel}
    </button>
  {/if}
</div>
