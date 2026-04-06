<script module lang="ts">
  export interface GlassSelectOption<T extends string = string> {
    value: T;
    label: string;
  }

  /** Placeholder copy for empty-first {@link GlassSelectDropdown} rows (single source of truth). */
  export const glassSelectEmptyLabels = {
    generic: 'Select...',
    modelField: 'Select a field...'
  } as const;

  /** Prepends `value: ''` so the trigger can show a placeholder until the user picks an option. */
  export function glassSelectOptionsWithEmptyFirst<T extends string>(
    emptyLabel: string,
    options: readonly GlassSelectOption<T>[]
  ): GlassSelectOption<T | ''>[] {
    return [{ value: '' as T | '', label: emptyLabel }, ...options];
  }

  export interface GlassSelectDropdownProps<T extends string = string> {
    value: T;
    options: readonly GlassSelectOption<T>[];
    onSelect: (value: T) => void;
    disabled?: boolean;
    id?: string;
    /** Outer wrapper — width, e.g. `w-full` or `min-w-[7rem]` */
    class?: string;
    ariaLabel?: string;
    /** Use monospace for the value + list (HTTP methods, operators). */
    mono?: boolean;
  }
</script>

<script lang="ts">
  import { dropdownListScroll, dropdownPanel, dropdownRow, glassSelectTrigger } from '$lib/ui/classes';

  interface Props extends GlassSelectDropdownProps<string> {}

  let {
    value,
    options,
    onSelect,
    disabled = false,
    id,
    class: className = '',
    ariaLabel,
    mono = false
  }: Props = $props();

  let dropdownOpen = $state(false);
  let blurTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const selectedLabel = $derived(options.find(o => o.value === value)?.label ?? String(value));

  function scheduleClose(): void {
    blurTimeoutId = setTimeout(() => {
      dropdownOpen = false;
      blurTimeoutId = null;
    }, 150);
  }

  function handleTriggerClick(e: MouseEvent): void {
    e.preventDefault();
    if (disabled) return;
    if (blurTimeoutId) {
      clearTimeout(blurTimeoutId);
      blurTimeoutId = null;
    }
    dropdownOpen = !dropdownOpen;
  }

  function handleSelect(next: string): void {
    onSelect(next);
    dropdownOpen = false;
  }
</script>

<div class="relative {className}">
  <button
    type="button"
    {id}
    class={glassSelectTrigger}
    {disabled}
    aria-label={ariaLabel}
    aria-expanded={dropdownOpen}
    aria-haspopup="listbox"
    onclick={handleTriggerClick}
    onblur={scheduleClose}
  >
    <span class="truncate text-left text-mono-300 {mono ? 'font-mono' : ''}">{selectedLabel}</span>
    <i class="fa-solid fa-chevron-down text-mono-400 text-xs shrink-0 pointer-events-none" aria-hidden="true"></i>
  </button>

  {#if dropdownOpen && !disabled}
    <div class={dropdownPanel} role="listbox">
      <div class={dropdownListScroll}>
        {#each options as opt (opt.value)}
          <button
            type="button"
            role="option"
            aria-selected={opt.value === value}
            class="{dropdownRow} text-sm text-mono-300 {mono ? 'font-mono' : ''} {opt.value === value ? 'bg-mono-800' : ''}"
            onmousedown={(e) => e.preventDefault()}
            onclick={() => handleSelect(opt.value)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
