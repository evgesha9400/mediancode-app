<script lang="ts">
  import { getStatCardTestId } from '$lib/utils/testIds';

  export interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    trend?: string;
  }

  interface Props extends StatCardProps {}

  let { title, value, icon, trend }: Props = $props();
</script>

<div class="bg-white rounded-lg border border-mono-200 p-6" data-testid={getStatCardTestId(title)}>
  <div class="flex items-center justify-between mb-4">
    <div class="w-12 h-12 bg-mono-100 rounded-lg flex items-center justify-center">
      <i class="fa-solid {icon} text-mono-700 text-xl"></i>
    </div>
    {#if trend}
      <span class="text-xs text-mono-500">{trend}</span>
    {/if}
  </div>
  <div class="text-2xl text-mono-900 font-semibold mb-1" data-testid="stat-value">{value}</div>
  <div class="text-sm text-mono-500">{title}</div>
</div>
