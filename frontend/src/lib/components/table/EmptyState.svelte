<script lang="ts">
  export let icon: string = 'fa-search';
  export let title: string;
  export let message: string;
</script>

<div class="flex flex-col items-center justify-center py-12 px-6">
  <i class="fa-solid {icon} text-4xl text-mono-300 mb-4"></i>
  <h3 class="text-lg font-medium text-mono-900 mb-2">{title}</h3>
  <p class="text-sm text-mono-500">{message}</p>
</div>
