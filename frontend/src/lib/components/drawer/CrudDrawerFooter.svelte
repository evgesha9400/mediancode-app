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
  }
</script>

<script lang="ts">
  import { Tooltip } from '$lib/components/tooltip';

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
    onDeleteCancel
  }: Props = $props();
</script>

{#if mode === 'creating'}
  {@const canCreate = isFormValid && !isSaving}
  <button
    type="button"
    onclick={onCreate}
    disabled={!canCreate}
    class="w-full px-4 py-2 rounded-md transition-colors font-medium {canCreate ? 'bg-green-400 text-mono-950 font-bold hover:bg-green-300 cursor-pointer' : 'bg-mono-700 text-mono-500 cursor-not-allowed'}"
  >
    {#if isSaving}
      <i class="fa-solid fa-spinner fa-spin mr-2"></i>
      Creating...
    {:else}
      Create
    {/if}
  </button>
{:else}
  {@const canSave = hasChanges && !isSaving}
  <button
    type="button"
    onclick={onSave}
    disabled={!canSave}
    class="w-full px-4 py-2 rounded-md transition-colors font-medium {canSave ? 'bg-green-400 text-mono-950 font-bold hover:bg-green-300 cursor-pointer' : 'bg-mono-700 text-mono-500 cursor-not-allowed'}"
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
    class="w-full px-4 py-2 border rounded-md transition-colors font-medium {hasChanges && !isSaving ? 'border-mono-600 text-mono-300 hover:bg-mono-800 cursor-pointer' : 'border-mono-700 text-mono-400 cursor-not-allowed bg-mono-800'}"
  >
    Undo
  </button>
  {#if !showDeleteConfirm}
    <Tooltip text={deleteTooltip} position="top">
      <button
        type="button"
        onclick={onDeleteRequest}
        disabled={!canDelete}
        class="w-full px-4 py-2 rounded-md flex items-center justify-center transition-colors font-medium {!canDelete ? 'bg-mono-700 text-mono-400 cursor-not-allowed' : 'bg-red-400/10 text-red-400 hover:bg-red-400/20 cursor-pointer'}"
      >
        <i class="fa-solid fa-xmark mr-2"></i>
        <span>Delete</span>
      </button>
    </Tooltip>
  {:else}
    <div class="bg-red-400/10 border border-red-400/30 rounded-md p-3">
      <p class="text-sm text-red-400 mb-2">Are you sure?</p>
      <div class="flex space-x-2">
        <button
          type="button"
          onclick={onDeleteConfirm}
          disabled={isDeleting}
          class="flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors {isDeleting ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'}"
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
          class="flex-1 px-3 py-1.5 border rounded-md text-sm font-medium transition-colors {isDeleting ? 'border-mono-700 text-mono-400 cursor-not-allowed bg-mono-800' : 'border-mono-600 text-mono-300 hover:bg-mono-800 cursor-pointer'}"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
{/if}
