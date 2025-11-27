<script lang="ts">
  import type { EndpointTag } from '$lib/types';
  import CollapsibleCard from './CollapsibleCard.svelte';
  import TagEditModal from '../TagEditModal.svelte';
  import ConfirmDialog from '../ConfirmDialog.svelte';

  export interface TagsCardProps {
    tags: EndpointTag[];
    onAdd: (data: { name: string; description: string }) => void;
    onEdit: (tagId: string, data: { name: string; description: string }) => void;
    onDelete: (tagId: string) => void;
    getEndpointCount: (tagId: string) => number;
  }

  interface Props extends TagsCardProps {}

  let { tags, onAdd, onEdit, onDelete, getEndpointCount }: Props = $props();

  // Modal state
  let showEditModal = $state(false);
  let showDeleteDialog = $state(false);
  let editingTag = $state<EndpointTag | undefined>(undefined);
  let deletingTagId = $state<string | undefined>(undefined);

  // Handle add tag button click
  function handleAddClick() {
    editingTag = undefined;
    showEditModal = true;
  }

  // Handle edit tag button click
  function handleEditClick(tag: EndpointTag) {
    editingTag = tag;
    showEditModal = true;
  }

  // Handle delete tag button click
  function handleDeleteClick(tagId: string) {
    deletingTagId = tagId;
    showDeleteDialog = true;
  }

  // Handle modal save
  function handleModalSave(data: { name: string; description: string }) {
    if (editingTag) {
      onEdit(editingTag.id, data);
    } else {
      onAdd(data);
    }
    showEditModal = false;
    editingTag = undefined;
  }

  // Handle modal cancel
  function handleModalCancel() {
    showEditModal = false;
    editingTag = undefined;
  }

  // Handle delete confirm
  function handleDeleteConfirm() {
    if (deletingTagId) {
      onDelete(deletingTagId);
    }
    showDeleteDialog = false;
    deletingTagId = undefined;
  }

  // Handle delete cancel
  function handleDeleteCancel() {
    showDeleteDialog = false;
    deletingTagId = undefined;
  }

  // Get endpoint count for deletion dialog
  const deletingTagEndpointCount = $derived(
    deletingTagId ? getEndpointCount(deletingTagId) : 0
  );

  // Get deleting tag name for dialog
  const deletingTagName = $derived(
    deletingTagId ? tags.find(t => t.id === deletingTagId)?.name || 'this tag' : 'this tag'
  );

  // Build the appropriate delete message
  const deleteMessage = $derived.by(() => {
    if (deletingTagEndpointCount === 0) {
      return `Are you sure you want to delete "${deletingTagName}"?`;
    }

    const endpointText = deletingTagEndpointCount === 1 ? '1 endpoint' : `${deletingTagEndpointCount} endpoints`;

    return `This tag is used by ${endpointText}. Deleting it will remove the tag from ${deletingTagEndpointCount === 1 ? 'this endpoint' : 'these endpoints'}.`;
  });
</script>

<CollapsibleCard title="Endpoint Tags" icon="fa-tags">
  {#snippet actions()}
    <button
      onclick={handleAddClick}
      class="px-3 py-1.5 bg-mono-900 text-white text-sm rounded-md flex items-center space-x-2 hover:bg-mono-800"
    >
      <i class="fa-solid fa-plus"></i>
      <span>Add Tag</span>
    </button>
  {/snippet}

  {#if tags.length === 0}
    <div class="text-center py-6 text-mono-500">
      <i class="fa-solid fa-tags text-2xl mb-2 text-mono-300"></i>
      <p class="text-sm">No tags yet. Add your first tag to organize endpoints.</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each tags as tag (tag.id)}
        <div class="flex items-center justify-between p-2.5 bg-mono-50 rounded-md border border-mono-200">
          <div class="flex items-center space-x-3">
            <i class="fa-solid fa-grip-vertical text-mono-400"></i>
            <div>
              <p class="text-sm text-mono-900">{tag.name}</p>
              <p class="text-xs text-mono-500">{tag.description}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">
              {getEndpointCount(tag.id)} endpoints
            </span>
            <button
              onclick={() => handleEditClick(tag)}
              class="text-mono-500 hover:text-mono-700"
              title="Edit tag"
            >
              <i class="fa-solid fa-pencil"></i>
            </button>
            <button
              onclick={() => handleDeleteClick(tag.id)}
              class="text-mono-500 hover:text-mono-600"
              title="Delete tag"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</CollapsibleCard>

<!-- Tag Edit Modal -->
<TagEditModal
  open={showEditModal}
  tag={editingTag}
  onSave={handleModalSave}
  onCancel={handleModalCancel}
/>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  open={showDeleteDialog}
  title="Delete Tag"
  message={deleteMessage}
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
  onConfirm={handleDeleteConfirm}
  onCancel={handleDeleteCancel}
/>
