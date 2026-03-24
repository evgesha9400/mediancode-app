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
      <h2 class="text-xs uppercase tracking-wider text-mono-500 font-medium">Project Setup</h2>
      <div class="flex items-center space-x-3">
        <span class="text-xs text-mono-400">{completedCount}/{steps.length} completed</span>
        <button
          onclick={dismiss}
          class="text-mono-400 hover:text-mono-300 transition-colors cursor-pointer"
          aria-label="Dismiss checklist"
          data-testid="checklist-dismiss-btn"
        >
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>
    </div>
    
    <div class="bg-mono-900 border-2 border-mono-700 p-5" data-testid="project-checklist">
      <!-- Progress bar -->
      <div class="w-full bg-mono-800 rounded-full h-1.5 mb-4">
        <div
          class="bg-green-400 h-1.5 rounded-full transition-all duration-300"
          style="width: {(completedCount / steps.length) * 100}%"
          data-testid="checklist-progress"
        ></div>
      </div>

      <ul class="space-y-3">
        {#each steps as step, i}
        <li class="flex items-start space-x-3">
          <div class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 {step.completed ? 'bg-green-400' : 'border-2 border-mono-600'}">
            {#if step.completed}
              <i class="fa-solid fa-check text-white text-xs"></i>
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-sm {step.completed ? 'text-mono-400 line-through' : 'text-mono-100 font-medium'}">{step.label}</span>
              {#if !step.completed}
                <button
                  onclick={() => goto(step.href)}
                  class="text-xs text-mono-400 hover:text-mono-100 transition-colors cursor-pointer"
                  data-testid="checklist-step-{i}-btn"
                >
                  Start
                </button>
              {/if}
            </div>
            <p class="text-xs text-mono-400 mt-0.5">{step.description}</p>
          </div>
        </li>
      {/each}
    </ul>
  </div>
  </section>
{/if}
