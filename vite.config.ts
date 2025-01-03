import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	define: {
		'process.env.NODE_ENV': process.env.NODE_ENV === 'production' ? '"production"' : '"development"'
	},
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			kit: {
				trailingSlash: 'always',
				includeVersionFile: true
			},
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			devOptions: {
				enabled: true,
				type: 'module'
			},
			manifestFilename: 'manifest.webmanifest'
		})
	]
});
