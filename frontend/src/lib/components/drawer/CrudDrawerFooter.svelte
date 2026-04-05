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
  import DrawerFooterDeleteConfirm from './DrawerFooterDeleteConfirm.svelte';
  import {
    drawerFooterBtnDestructive,
    drawerFooterBtnDestructiveDisabledSegment,
    drawerFooterBtnPrimaryDisabledSegment,
    drawerFooterBtnPrimaryEnabled,
    drawerFooterBtnSecondarySegment,
    drawerFooterBtnSecondarySegmentMuted,
    drawerFooterBtnUndoSegment,
    drawerFooterBtnUndoSegmentMuted,
    drawerFooterSegmentDivider,
    drawerFooterSegmentedPanel,
    drawerFooterSegmentBtn,
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
  <div class={drawerFooterSegmentedPanel} role="group" aria-label="Create actions">
    {#if onCancel}
      <button
        type="button"
        onclick={onCancel}
        disabled={isSaving}
        class="{drawerFooterSegmentBtn} {drawerFooterBtnSecondarySegment} {isSaving ? 'cursor-not-allowed opacity-50' : ''}"
      >
        <span>Cancel</span>
        <i class="fa-solid fa-ban" aria-hidden="true"></i>
      </button>
      <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
    {/if}
    <button
      type="button"
      onclick={onCreate}
      disabled={!canCreate}
      class="{drawerFooterSegmentBtn} {canCreate ? drawerFooterBtnPrimaryEnabled : drawerFooterBtnPrimaryDisabledSegment}"
    >
      {#if isSaving}
        <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
        <span>Creating...</span>
      {:else}
        <span>Create</span>
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
      {/if}
    </button>
  </div>
{:else}
  {@const canSave = hasChanges && !isSaving}
  {#if !showDeleteConfirm}
    <div class={drawerFooterSegmentedPanel} role="group" aria-label="Edit actions">
      <Tooltip text={deleteTooltip} position="top" wrapperClass="w-full sm:flex-1 sm:min-w-0 flex">
        <button
          type="button"
          onclick={onDeleteRequest}
          disabled={!canDelete}
          class="{drawerFooterSegmentBtn} font-medium {!canDelete ? drawerFooterBtnDestructiveDisabledSegment : drawerFooterBtnDestructive}"
        >
          <span>Delete</span>
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        </button>
      </Tooltip>
      <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
      <button
        type="button"
        onclick={onUndo}
        disabled={!hasChanges || isSaving}
        class="{drawerFooterSegmentBtn} {hasChanges && !isSaving ? drawerFooterBtnUndoSegment : drawerFooterBtnUndoSegmentMuted}"
      >
        <span>Undo</span>
        <i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
      </button>
      <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
      <button
        type="button"
        onclick={onSave}
        disabled={!canSave}
        class="{drawerFooterSegmentBtn} {canSave ? drawerFooterBtnPrimaryEnabled : drawerFooterBtnPrimaryDisabledSegment}"
      >
        {#if isSaving}
          <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
          <span>Saving...</span>
        {:else}
          <span>Save</span>
          <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
        {/if}
      </button>
    </div>
  {:else}
    <DrawerFooterDeleteConfirm
      prompt="Are you sure?"
      promptId="crud-drawer-delete-confirm-prompt"
      actionsAriaLabel="Confirm or cancel delete"
      busy={isDeleting}
      onCancel={() => onDeleteCancel?.()}
      onConfirm={() => onDeleteConfirm?.()}
    />
  {/if}
{/if}
