<script lang="ts">
  import { ClerkUserProfile } from '$lib/components/clerk';
  import { MainColumnFrame, PageHeader } from '$lib/components';
</script>

<MainColumnFrame bodyClass="p-6">
  {#snippet header()}
    <PageHeader title="Settings" description="Manage your account and profile settings">
      {#snippet actions()}
        <a
          href="/settings/organization"
          class="inline-flex items-center space-x-2 px-4 py-2 bg-green-400 text-mono-950 font-inter font-semibold rounded-xl text-sm tracking-wide shadow-sm hover:bg-green-300 transition-colors"
        >
          <i class="fa-solid fa-building"></i>
          <span>Organization Settings</span>
        </a>
      {/snippet}
    </PageHeader>
  {/snippet}

  <section>
    <h2 class="text-xs uppercase tracking-wider text-mono-500 mb-3 font-medium">Account</h2>
    <div class="bg-mono-900/50 backdrop-blur-sm border-2 border-mono-700 overflow-hidden">
      <ClerkUserProfile />
    </div>
  </section>
</MainColumnFrame>
