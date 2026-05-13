<!--
  Shared delete-confirmation strip for drawer footers: banner prompt + segmented Cancel / Confirm.
-->
<script module lang="ts">
  export interface DrawerFooterDeleteConfirmProps {
    /** Shown in the destructive banner above the actions. */
    prompt: string;
    /** Stable id for `aria-labelledby` on the outer group; must be unique per page. */
    promptId: string;
    /** `aria-label` for the Cancel / Confirm control group. */
    actionsAriaLabel: string;
    /** Disables both actions; confirm control shows busy/spinner state. */
    busy?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }
</script>

<script lang="ts">
  import {
    drawerFooterBtnDangerConfirmSegment,
    drawerFooterBtnDangerConfirmSegmentBusy,
    drawerFooterBtnSecondarySegment,
    drawerFooterBtnSecondarySegmentMuted,
    drawerFooterDeleteConfirmBanner,
    drawerFooterSegmentDivider,
    drawerFooterSegmentedPanel,
    drawerFooterSegmentBtn,
  } from '$lib/ui/classes';

  interface Props extends DrawerFooterDeleteConfirmProps {}

  let {
    prompt,
    promptId,
    actionsAriaLabel,
    busy = false,
    onCancel,
    onConfirm,
  }: Props = $props();
</script>

<div class="flex w-full flex-col" role="group" aria-labelledby={promptId}>
  <p id={promptId} class={drawerFooterDeleteConfirmBanner}>
    {prompt}
  </p>
  <div class={drawerFooterSegmentedPanel} role="group" aria-label={actionsAriaLabel}>
    <button
      type="button"
      onclick={onCancel}
      disabled={busy}
      class="{drawerFooterSegmentBtn} {busy ? drawerFooterBtnSecondarySegmentMuted : drawerFooterBtnSecondarySegment}"
    >
      <span>Cancel</span>
      <i class="fa-solid fa-ban" aria-hidden="true"></i>
    </button>
    <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
    <button
      type="button"
      onclick={onConfirm}
      disabled={busy}
      class="{drawerFooterSegmentBtn} {busy ? drawerFooterBtnDangerConfirmSegmentBusy : drawerFooterBtnDangerConfirmSegment}"
    >
      {#if busy}
        <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
        <span>Deleting...</span>
      {:else}
        <span>Yes, Delete</span>
        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
      {/if}
    </button>
  </div>
</div>
