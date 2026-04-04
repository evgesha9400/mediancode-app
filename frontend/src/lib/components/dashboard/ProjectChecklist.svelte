<script module lang="ts">
  export interface ProjectChecklistProps {
    hasFields: boolean;
    hasObjects: boolean;
    hasApis: boolean;
    hasConfiguredEndpoint: boolean;
  }
</script>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import {
    cardGlassBorderDefault,
    cardGlassSurface,
    dashboardControlTextMutedHoverPrimary,
    dashboardTextPrimary,
    marketingProgressBarGlow,
  } from '$lib/ui/classes';

  interface Props extends ProjectChecklistProps {}

  let { hasFields, hasObjects, hasApis, hasConfiguredEndpoint }: Props = $props();

  const DISMISSED_KEY = 'median-dashboard-checklist-dismissed';

  let dismissed = $state(browser ? localStorage.getItem(DISMISSED_KEY) === 'true' : false);

  function dismiss() {
    dismissed = true;
    localStorage.setItem(DISMISSED_KEY, 'true');
  }

  interface ChecklistStep {
    label: string;
    description: string;
    completed: boolean;
    href: string;
  }

  let steps: ChecklistStep[] = $derived([
    { label: 'Create a Field', description: 'Define data fields with types and constraints', completed: hasFields, href: '/fields' },
    { label: 'Compose an Object', description: 'Group fields into reusable data models', completed: hasObjects, href: '/objects' },
    { label: 'Create an API', description: 'Set up an API with title, version, and base URL', completed: hasApis, href: '/apis' },
    { label: 'Configure an Endpoint', description: 'Add an endpoint with a response body object', completed: hasConfiguredEndpoint, href: '/apis' },
    { label: 'Generate Code', description: 'Download production-ready FastAPI project', completed: false, href: '/apis' },
  ]);

  let completedCount = $derived(steps.filter(s => s.completed).length);
</script>

{#if !dismissed}
  <section class="flex flex-col" data-testid="project-checklist-wrapper">
    <div class="flex items-center justify-between mb-3 h-[24px]">
      <h2 class="text-xs uppercase font-inter tracking-wider text-mono-500 font-bold">Project Setup</h2>
      <div class="flex items-center space-x-3">
        <span class="text-xs font-inter font-medium text-mono-400">{completedCount}/{steps.length} completed</span>
        <button
          onclick={dismiss}
          class="text-mono-500 hover:text-mono-300 transition-colors cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/5"
          aria-label="Dismiss checklist"
          data-testid="checklist-dismiss-btn"
        >
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>
    </div>
    
    <div class="{cardGlassSurface} {cardGlassBorderDefault} p-6" data-testid="project-checklist">
      <!-- Progress bar -->
      <div class="w-full bg-mono-800/50 rounded-full h-2 mb-5 overflow-hidden">
        <div
          class="bg-green-400 h-full rounded-full transition-all duration-500 ease-out {marketingProgressBarGlow}"
          style="width: {(completedCount / steps.length) * 100}%"
          data-testid="checklist-progress"
        ></div>
      </div>

      <ul class="space-y-4">
        {#each steps as step, i}
        <li class="flex items-start space-x-3.5">
          <div class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors {step.completed ? 'bg-green-400/20 text-green-400' : 'border border-mono-600/50 text-transparent'}">
            <i class="fa-solid fa-check text-[10px]"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-inter {step.completed ? 'text-mono-500 line-through' : `${dashboardTextPrimary} font-semibold`}">{step.label}</span>
              {#if !step.completed}
                <button
                  onclick={() => goto(step.href)}
                  class="text-[11px] font-inter font-medium px-2 py-1 rounded bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer {dashboardControlTextMutedHoverPrimary}"
                  data-testid="checklist-step-{i}-btn"
                >
                  Start
                </button>
              {/if}
            </div>
            <p class="text-xs font-inter text-mono-400 mt-1 leading-relaxed">{step.description}</p>
          </div>
        </li>
      {/each}
    </ul>
  </div>
  </section>
{/if}
