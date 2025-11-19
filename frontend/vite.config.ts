import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					// Split Clerk into its own chunk
					if (id.includes('@clerk/clerk-js')) {
						return 'clerk';
					}
					// Split other node_modules into vendor chunks by package
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				}
			}
		}
	}
});
