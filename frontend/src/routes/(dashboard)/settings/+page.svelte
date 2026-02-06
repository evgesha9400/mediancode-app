<script lang="ts">
  import { ClerkUserProfile } from '$lib/components/clerk';
</script>

<!-- Header -->
<div class="bg-white border-b border-mono-200 py-4 px-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl text-mono-800 font-semibold">Settings</h1>
      <p class="text-sm text-mono-500 mt-1">Manage your account and profile settings</p>
    </div>
    <a
      href="/settings/organization"
      class="inline-flex items-center space-x-2 px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 transition-colors text-sm"
    >
      <i class="fa-solid fa-building"></i>
      <span>Organization Settings</span>
    </a>
  </div>
</div>

<!-- Main Settings Content -->
<div class="flex-1 overflow-auto p-6">
  <!-- User Profile Section -->
  <section>
    <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Account</h2>
    <div class="bg-white rounded-lg border border-mono-200 overflow-hidden">
      <ClerkUserProfile />
    </div>
  </section>
</div>
