<script lang="ts">
  import { ClerkOrganizationProfile, ClerkCreateOrganization } from '$lib/components/clerk';
  import { MainColumnFrame, PageHeader } from '$lib/components';
  import { dashboardCardGlass } from '$lib/ui/classes';
</script>

<MainColumnFrame bodyClass="p-6 space-y-8">
  {#snippet header()}
    <PageHeader
      title="Organization Settings"
      description="Manage your organization members and settings"
      back={{ href: '/settings', ariaLabel: 'Back to settings' }}
    />
  {/snippet}

  <section>
    <h2 class="text-xs uppercase tracking-wider text-fg-dimmed mb-3 font-medium">Create Organization</h2>
    <div class="{dashboardCardGlass} overflow-hidden">
      <ClerkCreateOrganization />
    </div>
  </section>

  <section>
    <h2 class="text-xs uppercase tracking-wider text-fg-dimmed mb-3 font-medium">Manage Organization</h2>
    <div class="{dashboardCardGlass} overflow-hidden">
      <ClerkOrganizationProfile />
    </div>
  </section>
</MainColumnFrame>
