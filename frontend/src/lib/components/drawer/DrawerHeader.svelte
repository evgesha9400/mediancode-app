<script lang="ts">
  export let title: string;
  export let onClose: () => void;
</script>

<div class="p-6 border-b border-mono-200">
  <div class="flex justify-between items-center">
    <h2 class="text-lg text-mono-800 font-semibold">{title}</h2>
    <button
      on:click={onClose}
      class="text-mono-500 hover:text-mono-700 transition-colors"
      aria-label="Close drawer"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
</div>
