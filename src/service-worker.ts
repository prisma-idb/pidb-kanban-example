/// <reference lib="WebWorker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST, { ignoreURLParametersMatching: [/callbackURL/] });

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

registerRoute(/.*/, new StaleWhileRevalidate());
