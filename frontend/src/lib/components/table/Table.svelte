<script lang="ts">
  export let isEmpty: boolean = false;
</script>

<div class="flex-1 overflow-auto">
  {#if !isEmpty}
    <table class="min-w-full bg-white">
      <thead class="bg-mono-50 sticky top-0">
        <slot name="header" />
      </thead>
      <tbody class="divide-y divide-mono-200">
        <slot name="body" />
      </tbody>
    </table>
  {/if}
  <slot name="empty" />
</div>
