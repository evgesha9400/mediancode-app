<script lang="ts">
  import { ClerkUserProfile } from '$lib/components/clerk';
  import { MainColumnFrame, PageHeader } from '$lib/components';
  import { dashboardCardGlass, dashboardPageHeaderPrimaryButton } from '$lib/ui/classes';
</script>

<MainColumnFrame bodyClass="p-6">
  {#snippet header()}
    <PageHeader title="Settings" description="Manage your account and profile settings">
      {#snippet actions()}
        <a
          href="/settings/organization"
          class="{dashboardPageHeaderPrimaryButton}"
        >
          <i class="fa-solid fa-building"></i>
          <span>Organization Settings</span>
        </a>
      {/snippet}
    </PageHeader>
  {/snippet}

  <section>
    <h2 class="text-xs uppercase tracking-wider text-fg-dimmed mb-3 font-medium">Account</h2>
    <div class="{dashboardCardGlass} overflow-hidden">
      <ClerkUserProfile />
    </div>
  </section>
</MainColumnFrame>
