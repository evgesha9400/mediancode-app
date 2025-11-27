<!--
  TagEditModal - Modal for creating and editing endpoint tags

  Displays a centered modal overlay for adding new tags or editing existing ones.
  Supports name and description fields with validation.

  @component
-->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { EndpointTag } from '$lib/types';

  export interface TagEditModalProps {
    /**
     * Whether the modal is currently open/visible
     */
    open: boolean;

    /**
     * Tag being edited (undefined for new tag)
     */
    tag?: EndpointTag;

    /**
     * Callback when save is clicked with updated tag data
     */
    onSave: (data: { name: string; description: string }) => void;

    /**
     * Callback when cancel is clicked
     */
    onCancel: () => void;
  }

  interface Props extends TagEditModalProps {}

  let { open, tag, onSave, onCancel }: Props = $props();

  // Form state
  let name = $state(tag?.name || '');
  let description = $state(tag?.description || '');

  // Update form when tag prop changes
  $effect(() => {
    if (tag) {
      name = tag.name;
      description = tag.description;
    } else {
      name = '';
      description = '';
    }
  });

  function handleSave() {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      return; // Validation: name is required
    }

    onSave({
      name: trimmedName,
      description: trimmedDescription
    });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  const isEditing = $derived(!!tag);
  const isValid = $derived(name.trim().length > 0);
</script>

{#if open}
  <!-- Backdrop -->
  <div
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 bg-mono-900/50 z-50 flex items-center justify-center p-4"
    onclick={onCancel}
    role="presentation"
  >
    <!-- Modal -->
    <div
      class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 id="modal-title" class="text-lg text-mono-900">
          <i class="fa-solid fa-tag text-mono-600 mr-2"></i>
          {isEditing ? 'Edit Tag' : 'Create Tag'}
        </h2>
        <button
          type="button"
          onclick={onCancel}
          class="text-mono-400 hover:text-mono-600 transition-colors"
          aria-label="Close"
        >
          <i class="fa-solid fa-times text-lg"></i>
        </button>
      </div>

      <!-- Form -->
      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="space-y-4">
          <!-- Name Field -->
          <div>
            <label for="tag-name" class="block text-sm text-mono-700 mb-2">
              Tag Name <span class="text-red-500">*</span>
            </label>
            <input
              id="tag-name"
              type="text"
              bind:value={name}
              onkeydown={handleKeydown}
              placeholder="e.g., User Management"
              class="w-full px-3 py-2 border border-mono-300 rounded-md text-mono-900 placeholder-mono-400 focus:outline-none focus:ring-2 focus:ring-mono-900 focus:border-transparent"
            />
          </div>

          <!-- Description Field -->
          <div>
            <label for="tag-description" class="block text-sm text-mono-700 mb-2">
              Description
            </label>
            <textarea
              id="tag-description"
              bind:value={description}
              placeholder="Optional description for this tag"
              rows="3"
              class="w-full px-3 py-2 border border-mono-300 rounded-md text-mono-900 placeholder-mono-400 focus:outline-none focus:ring-2 focus:ring-mono-900 focus:border-transparent resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onclick={onCancel}
            class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i class="fa-solid fa-{isEditing ? 'save' : 'plus'} mr-2"></i>
            {isEditing ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
