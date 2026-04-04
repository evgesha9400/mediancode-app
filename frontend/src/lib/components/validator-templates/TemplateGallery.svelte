<script module lang="ts">
  import type { FieldValidatorTemplate, ModelValidatorTemplate } from '$lib/types';

  export interface TemplateGalleryProps {
    /** 'field' or 'model' — determines which template list to show */
    kind: 'field' | 'model';
    /** Field validator templates (used when kind='field') */
    fieldTemplates?: FieldValidatorTemplate[];
    /** Model validator templates (used when kind='model') */
    modelTemplates?: ModelValidatorTemplate[];
    /** Called when the user picks a field template */
    onSelectField?: (template: FieldValidatorTemplate) => void;
    /** Called when the user picks a model template */
    onSelectModel?: (template: ModelValidatorTemplate) => void;
    /** Called when the user wants to close the gallery */
    onClose: () => void;
  }
</script>

<script lang="ts">
  import { Pill } from '../pill';
  import {
    inputValidatorSearch,
    surfaceInsideFrostedPanel,
    tableListAuxiliaryLabel,
    tableListBodyPrimary
  } from '$lib/ui/classes';

  interface Props extends TemplateGalleryProps {}

  let {
    kind,
    fieldTemplates = [],
    modelTemplates = [],
    onSelectField,
    onSelectModel,
    onClose
  }: Props = $props();

  let search = $state('');

  let filteredFieldTemplates = $derived(
    fieldTemplates.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    )
  );

  let filteredModelTemplates = $derived(
    modelTemplates.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    )
  );
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h3 class={tableListAuxiliaryLabel}>
      {kind === 'field' ? 'Field Validator Templates' : 'Model Validator Templates'}
    </h3>
    <button
      type="button"
      onclick={onClose}
      class="text-mono-400 hover:text-mono-300 transition-colors"
      title="Close gallery"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>

  <!-- Search -->
  <input
    type="text"
    bind:value={search}
    placeholder="Search templates..."
    class={inputValidatorSearch}
  />

  <!-- Template cards -->
  <div class="space-y-2 max-h-64 overflow-y-auto">
    {#if kind === 'field'}
      {#each filteredFieldTemplates as template}
        <button
          type="button"
          onclick={() => onSelectField?.(template)}
          class="w-full text-left p-3 {surfaceInsideFrostedPanel} hover:border-mono-400 hover:bg-mono-800 transition-colors cursor-pointer"
        >
          <div class="flex items-center justify-between">
            <span class={tableListBodyPrimary}>{template.name}</span>
            <Pill>{template.mode}</Pill>
          </div>
          <p class="text-xs text-mono-400 mt-1">{template.description}</p>
          <div class="flex flex-wrap gap-1 mt-1">
            {#each template.compatibleTypes as ctype}
              <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-700 text-mono-400">{ctype}</span>
            {/each}
          </div>
        </button>
      {:else}
        <p class="text-xs text-mono-400 italic p-2">No matching templates</p>
      {/each}
    {:else}
      {#each filteredModelTemplates as template}
        <button
          type="button"
          onclick={() => onSelectModel?.(template)}
          class="w-full text-left p-3 {surfaceInsideFrostedPanel} hover:border-mono-400 hover:bg-mono-800 transition-colors cursor-pointer"
        >
          <div class="flex items-center justify-between">
            <span class={tableListBodyPrimary}>{template.name}</span>
            <Pill>{template.mode}</Pill>
          </div>
          <p class="text-xs text-mono-400 mt-1">{template.description}</p>
          <div class="flex flex-wrap gap-1 mt-1">
            {#each template.fieldMappings as fm}
              <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-700 text-mono-400">{fm.label}</span>
            {/each}
          </div>
        </button>
      {:else}
        <p class="text-xs text-mono-400 italic p-2">No matching templates</p>
      {/each}
    {/if}
  </div>
</div>
