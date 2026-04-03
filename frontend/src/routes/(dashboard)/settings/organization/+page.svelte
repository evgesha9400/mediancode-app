<script lang="ts">
  import { ClerkOrganizationProfile, ClerkCreateOrganization } from '$lib/components/clerk';
  import { MainColumnFrame, PageHeader } from '$lib/components';
</script>

<MainColumnFrame bodyClass="p-6 space-y-8">
  {#snippet header()}
    <PageHeader title="Organization Settings" description="Manage your organization members and settings">
      {#snippet prepend()}
        <a
          href="/settings"
          class="inline-flex items-center justify-center w-8 h-8 border border-mono-600/50 rounded-lg text-mono-400 hover:bg-mono-800/50 hover:text-white transition-colors shrink-0"
          aria-label="Back to settings"
        >
          <i class="fa-solid fa-arrow-left"></i>
        </a>
      {/snippet}
    </PageHeader>
  {/snippet}

  <section>
    <h2 class="text-xs uppercase tracking-wider text-mono-500 mb-3 font-medium">Create Organization</h2>
    <div class="bg-mono-900/50 backdrop-blur-sm border-2 border-mono-700 overflow-hidden">
      <ClerkCreateOrganization />
    </div>
  </section>

  <section>
    <h2 class="text-xs uppercase tracking-wider text-mono-500 mb-3 font-medium">Manage Organization</h2>
    <div class="bg-mono-900/50 backdrop-blur-sm border-2 border-mono-700 overflow-hidden">
      <ClerkOrganizationProfile />
    </div>
  </section>
</MainColumnFrame>
