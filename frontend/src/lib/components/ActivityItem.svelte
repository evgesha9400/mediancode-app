<script lang="ts">
  import type { ActivityItemProps } from '$lib/types';

  interface Props extends ActivityItemProps {}

  let { icon, title, name, description, time, showBorder = true }: Props = $props();
</script>

<div class="flex items-start space-x-4 {showBorder ? 'pb-4 border-b border-mono-100' : ''}">
  <div class="w-10 h-10 bg-mono-100 rounded-full flex items-center justify-center flex-shrink-0">
    <i class="fa-solid {icon} text-mono-600"></i>
  </div>
  <div class="flex-1">
    <div class="flex items-center justify-between mb-1">
      <p class="text-sm text-mono-900">
        {title}: <span class="font-medium">{name}</span>
      </p>
      <span class="text-xs text-mono-500">{time}</span>
    </div>
    <p class="text-xs text-mono-500">{description}</p>
  </div>
</div>
