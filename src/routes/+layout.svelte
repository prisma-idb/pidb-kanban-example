<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import { pwaInfo } from 'virtual:pwa-info';
	import '../app.css';

	let { children } = $props();
	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html webManifestLink}
</svelte:head>

<Toaster />
<ModeWatcher />

<Sidebar.Provider>
	<AppSidebar />
	<main class="w-full gap-2 p-2">
		<Sidebar.Trigger />
		<div class="mx-auto flex w-full flex-col gap-2 py-2">
			{@render children?.()}
		</div>
	</main>
</Sidebar.Provider>
