<script lang="ts">
  import { Modal } from '$lib/components/modal';
  import { generateApi } from '$lib/api/apis';

  interface GenerateModalProps {
    open: boolean;
    apiId: string;
    apiTitle: string;
    onClose: () => void;
  }

  let { open, apiId, apiTitle, onClose }: GenerateModalProps = $props();

  let generating = $state(false);
  let error = $state<string | null>(null);

  async function handleGenerate() {
    generating = true;
    error = null;

    try {
      const blob = await generateApi(apiId);

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${apiTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      error = err.detail || err.message || 'Something went wrong. Please try again.';
    } finally {
      generating = false;
    }
  }
</script>

<Modal {open} onClose={generating ? undefined : onClose} preventCloseOnOverlay={generating}>
  <div class="p-6">
    <!-- Header -->
    <h2 class="text-lg font-semibold text-mono-900 mb-4">Generate Code</h2>

    <!-- Credit cost -->
    <div class="flex items-center space-x-2 text-sm text-mono-600 mb-6">
      <i class="fa-solid fa-coins text-mono-400"></i>
      <span>This will use <strong class="text-mono-900">1 credit</strong></span>
    </div>

    <!-- Error -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
        <p class="text-sm text-red-700">{error}</p>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex justify-end space-x-2">
      <button
        type="button"
        onclick={onClose}
        disabled={generating}
        class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md transition-colors font-medium {generating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-mono-50 cursor-pointer'}"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleGenerate}
        disabled={generating}
        class="px-4 py-2 rounded-md transition-colors font-medium flex items-center space-x-2 {generating ? 'bg-mono-600 text-white cursor-not-allowed' : 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer'}"
      >
        {#if generating}
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Generating...</span>
        {:else}
          <i class="fa-solid fa-code"></i>
          <span>Generate</span>
        {/if}
      </button>
    </div>
  </div>
</Modal>
