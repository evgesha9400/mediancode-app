<script lang="ts">
  export let title: string;
</script>

<div class="bg-white border-b border-mono-200 py-4 px-6">
  <div class="flex justify-between items-center">
    <h1 class="text-xl text-mono-800 font-semibold">{title}</h1>
    <div class="flex items-center space-x-4">
      <slot name="actions" />
    </div>
  </div>
</div>
