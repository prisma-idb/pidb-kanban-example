import { browser } from '$app/environment';
import { initializeClient } from '$lib/client';

export const prerender = true;
export const trailingSlash = "always";

export async function load() {
	if (browser) await initializeClient();
}
