import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		files: {
			serviceWorker: 'src/service-worker.ts'
		},
		serviceWorker: { register: false },
		alias: {
			$routes: './src/routes'
		},
		paths: {
			base: process.env.NODE_ENV === 'production' ? '/pidb-kanban-example' : ''
		}
	}
};

export default config;
