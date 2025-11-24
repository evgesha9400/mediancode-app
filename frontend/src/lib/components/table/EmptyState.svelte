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
<script lang="ts">
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
  }

  interface Props extends EmptyStateProps {}

  let { icon = 'fa-search', title, message }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 px-6">
  <i class="fa-solid {icon} text-4xl text-mono-300 mb-4"></i>
  <h3 class="text-lg font-medium text-mono-900 mb-2">{title}</h3>
  <p class="text-sm text-mono-500">{message}</p>
</div>
