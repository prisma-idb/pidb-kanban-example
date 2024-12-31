/// <reference lib="WebWorker" />
/// <reference types="@sveltejs/kit" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
// import { base, build, files, prerendered, version } from '$service-worker';
declare let self: ServiceWorkerGlobalScope;

const manifest = self.__WB_MANIFEST;

manifest.forEach((entry) => {
	if (typeof entry === 'object' && entry.url.endsWith('__data.json')) {
		entry.url = entry.url.replace(/^prerendered\/dependencies\//, '');
	}
});

console.log(manifest);

cleanupOutdatedCaches();
precacheAndRoute(manifest, { ignoreURLParametersMatching: [/.*/] });

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

registerRoute(/.*/, new StaleWhileRevalidate());
