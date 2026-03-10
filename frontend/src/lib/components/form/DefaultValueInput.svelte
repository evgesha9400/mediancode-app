<script module lang="ts">
  export interface DefaultValueInputProps {
    fieldType: string;
    value: string;
    onChange: (value: string) => void;
    id?: string;
  }
</script>

<script lang="ts">
  import { Pill } from '../pill';

  type InputKind = 'text' | 'integer' | 'float' | 'bool';

  const PRESETS = ['None', 'True', 'False'] as const;

  let { fieldType, value, onChange, id }: DefaultValueInputProps = $props();

  let dropdownOpen = $state(false);
  let blurTimeoutId: ReturnType<typeof setTimeout> | null = null;

  function classify(type: string): InputKind {
    if (type === 'int') return 'integer';
    if (type === 'float') return 'float';
    if (type === 'bool') return 'bool';
    return 'text';
  }

  let kind = $derived(classify(fieldType));
  let isPreset = $derived(PRESETS.includes(value as typeof PRESETS[number]));

  let presetOptions = $derived.by((): string[] => {
    if (kind === 'bool') return ['None', 'True', 'False'];
    return ['None'];
  });

  function handleInputChange(e: Event) {
    onChange((e.currentTarget as HTMLInputElement).value);
  }

  function selectPreset(preset: string) {
    onChange(preset);
    dropdownOpen = false;
  }

  function clearPreset() {
    onChange('');
  }

  function toggleDropdown() {
    if (blurTimeoutId) {
      clearTimeout(blurTimeoutId);
      blurTimeoutId = null;
    }
    dropdownOpen = !dropdownOpen;
  }

  function handleBlur() {
    blurTimeoutId = setTimeout(() => {
      dropdownOpen = false;
      blurTimeoutId = null;
    }, 150);
  }
</script>

<div class="relative">
  <div
    class="flex items-center w-full border border-mono-600 rounded-md bg-mono-900 focus-within:ring-2 focus-within:ring-green-400 focus-within:border-transparent overflow-hidden"
  >
    {#if isPreset}
      <!-- Preset selected: show as a pill with clear button -->
      <div class="flex-1 flex items-center px-3 py-1.5 gap-2">
        <Pill class="font-medium">{value}</Pill>
        <button
          type="button"
          onclick={clearPreset}
          class="text-mono-400 hover:text-mono-200 transition-colors cursor-pointer"
          title="Clear preset"
        >
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
    {:else}
      <!-- Free-text input -->
      <input
        {id}
        type={kind === 'bool' ? 'text' : kind === 'text' ? 'text' : 'number'}
        step={kind === 'float' ? 'any' : kind === 'integer' ? '1' : undefined}
        value={value}
        disabled={kind === 'bool'}
        oninput={handleInputChange}
        placeholder={kind === 'text' ? 'e.g. default text' : kind === 'integer' ? 'e.g. 0' : kind === 'float' ? 'e.g. 0.0' : 'Select a value...'}
        class="flex-1 min-w-0 px-3 py-1.5 text-sm border-0 outline-none bg-transparent text-mono-100 {kind === 'bool' ? 'cursor-default text-mono-400' : ''}"
      />
    {/if}

    <!-- Dropdown caret -->
    <button
      type="button"
      onclick={toggleDropdown}
      onblur={handleBlur}
      class="px-2.5 py-1.5 text-mono-400 hover:text-mono-200 transition-colors cursor-pointer shrink-0 border-l border-mono-700"
      title="Select preset value"
    >
      <i class="fa-solid fa-chevron-down text-xs {dropdownOpen ? 'rotate-180' : ''} transition-transform"></i>
    </button>
  </div>

  <!-- Dropdown options -->
  {#if dropdownOpen}
    <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-600 rounded-md shadow-lg shadow-black/30">
      {#each presetOptions as option}
        <button
          type="button"
          onclick={() => selectPreset(option)}
          class="w-full px-3 py-2 text-left text-sm hover:bg-mono-800 transition-colors {value === option ? 'bg-mono-800 text-mono-100 font-medium' : 'text-mono-300'} first:rounded-t-md last:rounded-b-md"
        >
          {option}
        </button>
      {/each}
    </div>
  {/if}
</div>
