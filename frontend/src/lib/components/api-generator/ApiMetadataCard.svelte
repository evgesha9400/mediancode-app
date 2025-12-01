<script lang="ts">
  import type { ApiMetadata } from '$lib/types';
  import CollapsibleCard from './CollapsibleCard.svelte';

  export interface ApiMetadataCardProps {
    metadata: ApiMetadata;
    onUpdate: (updates: Partial<ApiMetadata>) => void;
  }

  interface Props extends ApiMetadataCardProps {}

  let { metadata, onUpdate }: Props = $props();

  function handleInput(field: keyof ApiMetadata, value: string) {
    onUpdate({ [field]: value });
  }
</script>

<CollapsibleCard title="API Metadata" icon="fa-info-circle">
  <div class="space-y-4">
    <!-- Basic Metadata -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-mono-700 mb-1" for="api-metadata-title">API Title</label>
        <input
          id="api-metadata-title"
          type="text"
          value={metadata.title}
          oninput={(e) => handleInput('title', e.currentTarget.value)}
          placeholder="My API"
          class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>
      <div>
        <label class="block text-sm text-mono-700 mb-1" for="api-metadata-version">Version</label>
        <input
          id="api-metadata-version"
          type="text"
          value={metadata.version}
          oninput={(e) => handleInput('version', e.currentTarget.value)}
          placeholder="1.0.0"
          class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>
      <div class="col-span-2">
        <label class="block text-sm text-mono-700 mb-1" for="api-metadata-description">Description</label>
        <textarea
          id="api-metadata-description"
          rows="2"
          value={metadata.description}
          oninput={(e) => handleInput('description', e.currentTarget.value)}
          placeholder="API description"
          class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        ></textarea>
      </div>
      <div>
        <label class="block text-sm text-mono-700 mb-1" for="api-metadata-server-url">Server URL</label>
        <input
          id="api-metadata-server-url"
          type="text"
          value={metadata.serverUrl}
          oninput={(e) => handleInput('serverUrl', e.currentTarget.value)}
          placeholder="https://api.example.com"
          class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>
      <div>
        <label class="block text-sm text-mono-700 mb-1" for="api-metadata-base-url">Base URL</label>
        <input
          id="api-metadata-base-url"
          type="text"
          value={metadata.baseUrl}
          oninput={(e) => handleInput('baseUrl', e.currentTarget.value)}
          placeholder="/api/v1"
          class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>
    </div>
  </div>
</CollapsibleCard>
