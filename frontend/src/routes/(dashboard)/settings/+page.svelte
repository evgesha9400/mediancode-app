<script lang="ts">
  import { ClerkUserProfile } from '$lib/components/clerk';
</script>

<!-- Header -->
<div class="bg-mono-950 border-b-2 border-mono-700 py-4 px-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl text-mono-100 font-semibold">Settings</h1>
      <p class="text-sm text-mono-400 mt-1">Manage your account and profile settings</p>
    </div>
    <a
      href="/settings/organization"
      class="inline-flex items-center space-x-2 px-4 py-2 bg-green-400 text-mono-950 font-bold rounded-md hover:bg-green-300 transition-colors text-sm"
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
    <h2 class="text-xs uppercase tracking-wider text-mono-500 mb-3 font-medium">Account</h2>
    <div class="bg-mono-900 rounded-lg border border-mono-700 overflow-hidden">
      <ClerkUserProfile />
    </div>
  </section>
</div>
