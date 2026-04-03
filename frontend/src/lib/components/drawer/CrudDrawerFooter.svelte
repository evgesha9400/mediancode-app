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
    drawerFooterBtnPrimaryDisabled,
    drawerFooterBtnPrimaryEnabled,
    drawerFooterBtnSecondary,
    drawerFooterBtnSecondaryMuted,
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
        class="w-full px-4 py-2 rounded-xl border flex items-center justify-center transition-colors font-medium text-sm font-inter tracking-wide {!canDelete ? 'bg-mono-700 border-mono-700 text-mono-400 cursor-not-allowed' : 'bg-red-400/10 border-transparent text-red-400 hover:bg-red-400/20 cursor-pointer'}"
      >
        <i class="fa-solid fa-xmark mr-2"></i>
        <span>Delete</span>
      </button>
    </Tooltip>
  {:else}
    <div class="bg-red-400/10 border border-red-400/30 p-3">
      <p class="text-sm text-red-400 mb-2">Are you sure?</p>
      <div class="flex space-x-2">
        <button
          type="button"
          onclick={onDeleteConfirm}
          disabled={isDeleting}
          class="flex-1 px-3 py-1.5 rounded-xl border text-sm font-medium font-inter tracking-wide transition-colors {isDeleting ? 'bg-red-400 border-transparent text-white cursor-not-allowed' : 'bg-red-600 border-transparent text-white hover:bg-red-700 cursor-pointer'}"
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
          class="flex-1 px-3 py-1.5 rounded-xl border text-sm font-medium font-inter tracking-wide transition-colors {isDeleting ? 'border-mono-700 text-mono-400 cursor-not-allowed bg-mono-800' : 'border-mono-600 text-mono-300 hover:bg-mono-800 cursor-pointer'}"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
{/if}
