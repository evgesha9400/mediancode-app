<script lang="ts">
  import { Modal } from '$lib/components/modal';
  import { generateApi, type GenerateOptions } from '$lib/api/apis';

  export interface GenerateModalProps {
    open: boolean;
    apiId: string;
    apiTitle: string;
    onClose: () => void;
  }

  let { open, apiId, apiTitle, onClose }: GenerateModalProps = $props();

  let generating = $state(false);
  let error = $state<string | null>(null);

  // Generation options (initialized to backend defaults)
  let responsePlaceholders = $state(true);
  let databaseEnabled = $state(false);

  // CDK options
  let cdkEnabled = $state(false);
  let cdkCompute = $state<'lambda' | 'ecs'>('lambda');

  async function handleGenerate() {
    generating = true;
    error = null;

    try {
      const { blob, filename } = await generateApi(apiId, {
        responsePlaceholders,
        databaseEnabled,
        cdkEnabled,
        cdkCompute
      });

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `${apiTitle}.zip`;
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
    <h2 class="text-lg font-semibold text-mono-100 mb-4">Generate Code</h2>

    <!-- Credit cost -->
    <div class="flex items-center space-x-2 text-sm text-mono-400 mb-4">
      <i class="fa-solid fa-coins text-mono-400"></i>
      <span>This will use <strong class="text-mono-100">1 credit</strong></span>
    </div>

    <!-- Options -->
    <div class="mb-6">
      <div class="flex items-center space-x-2 mb-3">
        <i class="fa-solid fa-gear text-mono-400 text-sm"></i>
        <span class="text-sm font-medium text-mono-300">Options</span>
      </div>

      <div class="space-y-3">
        <!-- Response placeholders -->
        <div>
          <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" bind:checked={responsePlaceholders}
              class="w-4 h-4 text-green-400 border-mono-600 rounded focus:ring-2 focus:ring-green-400 bg-mono-900/50 backdrop-blur-sm" />
            <span class="text-xs text-mono-300">Generate response placeholders</span>
          </label>
        </div>

        <!-- Database support -->
        <div>
          <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" bind:checked={databaseEnabled}
              class="w-4 h-4 text-green-400 border-mono-600 rounded focus:ring-2 focus:ring-green-400 bg-mono-900/50 backdrop-blur-sm" />
            <span class="text-xs text-mono-300">Database support</span>
            <span class="text-xs text-mono-400">PostgreSQL, SQLAlchemy, Alembic, Docker Compose</span>
          </label>
        </div>

        <!-- CDK infrastructure -->
        <div>
          <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" bind:checked={cdkEnabled}
              class="w-4 h-4 text-green-400 border-mono-600 rounded focus:ring-2 focus:ring-green-400 bg-mono-900/50 backdrop-blur-sm" />
            <span class="text-xs text-mono-300">CDK infrastructure</span>
            <span class="text-xs text-mono-400">AWS CDK stack files</span>
          </label>

          {#if cdkEnabled}
            <div class="mt-2 ml-6">
              <p class="text-xs text-mono-400 mb-1">Compute</p>
              <div class="flex space-x-3">
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" bind:group={cdkCompute} value="lambda"
                    class="w-3.5 h-3.5 text-green-400 border-mono-600 bg-mono-900/50 backdrop-blur-sm focus:ring-green-400" />
                  <span class="text-xs text-mono-300">Lambda</span>
                </label>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" bind:group={cdkCompute} value="ecs"
                    class="w-3.5 h-3.5 text-green-400 border-mono-600 bg-mono-900/50 backdrop-blur-sm focus:ring-green-400" />
                  <span class="text-xs text-mono-300">ECS Fargate</span>
                </label>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Error -->
    {#if error}
      <div class="bg-red-400/10 border border-red-400/30 p-3 mb-4">
        <p class="text-sm text-red-400">{error}</p>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex justify-end space-x-2">
      <button
        type="button"
        onclick={onClose}
        disabled={generating}
        class="px-4 py-2 border border-mono-600 text-mono-300 transition-colors font-medium {generating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-mono-800 cursor-pointer'}"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleGenerate}
        disabled={generating}
        class="px-4 py-2 transition-colors font-medium tracking-wide flex items-center space-x-2 {generating ? 'bg-mono-700 text-mono-400 cursor-not-allowed' : 'bg-green-400 text-mono-950 font-bold hover:bg-green-300 cursor-pointer'}"
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
