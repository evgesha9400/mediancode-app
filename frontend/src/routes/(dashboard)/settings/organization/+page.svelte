<script lang="ts">
  import { ClerkOrganizationProfile, ClerkCreateOrganization } from '$lib/components/clerk';
</script>

<!-- Header -->
<div class="bg-white border-b border-mono-200 py-4 px-6">
  <div class="flex items-center space-x-4">
    <a
      href="/settings"
      class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-mono-300 text-mono-600 hover:bg-mono-50 transition-colors"
      aria-label="Back to settings"
    >
      <i class="fa-solid fa-arrow-left"></i>
    </a>
    <div>
      <h1 class="text-2xl text-mono-800 font-semibold">Organization Settings</h1>
      <p class="text-sm text-mono-500 mt-1">Manage your organization members and settings</p>
    </div>
  </div>
</div>

<!-- Main Organization Settings Content -->
<div class="flex-1 overflow-auto p-6 space-y-8">
  <!-- Create Organization Section -->
  <section>
    <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Create Organization</h2>
    <div class="bg-white rounded-lg border border-mono-200 overflow-hidden">
      <ClerkCreateOrganization />
    </div>
  </section>

  <!-- Organization Profile Section -->
  <section>
    <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Manage Organization</h2>
    <div class="bg-white rounded-lg border border-mono-200 overflow-hidden">
      <ClerkOrganizationProfile />
    </div>
  </section>
</div>
