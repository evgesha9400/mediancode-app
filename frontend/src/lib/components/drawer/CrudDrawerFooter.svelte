<script module lang="ts">
  export interface CrudDrawerFooterProps {
    /** Current drawer mode */
    mode: 'creating' | 'editing';
    /** Whether the form is currently saving */
    isSaving?: boolean;
    /** Whether the form is valid (used in create mode to enable/disable button) */
    isFormValid?: boolean;
    /** Whether there are unsaved changes (used in edit mode) */
    hasChanges?: boolean;
    /** Whether delete is allowed (false disables button with tooltip) */
    canDelete?: boolean;
    /** Tooltip text shown when delete is disabled */
    deleteTooltip?: string;
    /** Whether delete confirmation is showing */
    showDeleteConfirm?: boolean;
    /** Whether the entity is currently being deleted */
    isDeleting?: boolean;
    /** Called when create button is clicked */
    onCreate?: () => void;
    /** Called when save button is clicked */
    onSave?: () => void;
    /** Called when undo button is clicked */
    onUndo?: () => void;
    /** Called when delete button is clicked (shows confirmation) */
    onDeleteRequest?: () => void;
    /** Called when delete is confirmed */
    onDeleteConfirm?: () => void;
    /** Called when delete confirmation is cancelled */
    onDeleteCancel?: () => void;
    /** Called when drawer cancellation is requested */
    onCancel?: () => void;
  }
</script>

<script lang="ts">
  import { Tooltip } from '$lib/components/tooltip';
  import {
    drawerFooterBtnBlock,
    drawerFooterBtnDangerCancel,
    drawerFooterBtnDangerCancelBusy,
    drawerFooterBtnDangerConfirm,
    drawerFooterBtnDangerConfirmBusy,
    drawerFooterBtnDestructive,
    drawerFooterBtnDestructiveDisabled,
    drawerFooterBtnPrimaryDisabled,
    drawerFooterBtnPrimaryEnabled,
    drawerFooterBtnSecondary,
    drawerFooterBtnSecondaryMuted,
    drawerFooterDangerCallout,
  } from '$lib/ui/classes';

  interface Props extends CrudDrawerFooterProps {}

  let {
    mode,
    isSaving = false,
    isFormValid = true,
    hasChanges = false,
    canDelete = true,
    deleteTooltip = '',
    showDeleteConfirm = false,
    isDeleting = false,
    onCreate,
    onSave,
    onUndo,
    onDeleteRequest,
    onDeleteConfirm,
    onDeleteCancel,
    onCancel
  }: Props = $props();
</script>

{#if mode === 'creating'}
  {@const canCreate = isFormValid && !isSaving}
  <button
    type="button"
    onclick={onCreate}
    disabled={!canCreate}
    class="{drawerFooterBtnBlock} {canCreate ? drawerFooterBtnPrimaryEnabled : drawerFooterBtnPrimaryDisabled}"
  >
    {#if isSaving}
      <i class="fa-solid fa-spinner fa-spin mr-2"></i>
      Creating...
    {:else}
      Create
    {/if}
  </button>
  {#if onCancel}
    <button
      type="button"
      onclick={onCancel}
      disabled={isSaving}
      class="{drawerFooterBtnBlock} border border-mono-600 {drawerFooterBtnSecondary} text-sm {isSaving ? 'cursor-not-allowed opacity-50' : ''}"
    >
      Cancel
    </button>
  {/if}
{:else}
  {@const canSave = hasChanges && !isSaving}
  <button
    type="button"
    onclick={onSave}
    disabled={!canSave}
    class="{drawerFooterBtnBlock} {canSave ? drawerFooterBtnPrimaryEnabled : drawerFooterBtnPrimaryDisabled}"
  >
    {#if isSaving}
      <i class="fa-solid fa-spinner fa-spin mr-2"></i>
      Saving...
    {:else}
      Save
    {/if}
  </button>
  <button
    type="button"
    onclick={onUndo}
    disabled={!hasChanges || isSaving}
    class="{drawerFooterBtnBlock} {hasChanges && !isSaving ? drawerFooterBtnSecondary : drawerFooterBtnSecondaryMuted}"
  >
    Undo
  </button>
  {#if !showDeleteConfirm}
    <Tooltip text={deleteTooltip} position="top">
      <button
        type="button"
        onclick={onDeleteRequest}
        disabled={!canDelete}
        class="{drawerFooterBtnBlock} flex items-center justify-center gap-2 font-medium {!canDelete
          ? drawerFooterBtnDestructiveDisabled
          : drawerFooterBtnDestructive}"
      >
        <i class="fa-solid fa-xmark mr-2"></i>
        <span>Delete</span>
      </button>
    </Tooltip>
  {:else}
    <div class={drawerFooterDangerCallout}>
      <p class="text-sm text-red-400 mb-2">Are you sure?</p>
      <div class="flex space-x-2">
        <button
          type="button"
          onclick={onDeleteConfirm}
          disabled={isDeleting}
          class={isDeleting ? drawerFooterBtnDangerConfirmBusy : drawerFooterBtnDangerConfirm}
        >
          {#if isDeleting}
            <i class="fa-solid fa-spinner fa-spin mr-1"></i>
            Deleting...
          {:else}
            Yes, Delete
          {/if}
        </button>
        <button
          type="button"
          onclick={onDeleteCancel}
          disabled={isDeleting}
          class={isDeleting ? drawerFooterBtnDangerCancelBusy : drawerFooterBtnDangerCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
{/if}
