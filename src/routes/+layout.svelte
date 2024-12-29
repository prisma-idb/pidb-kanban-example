<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import { pwaInfo } from 'virtual:pwa-info';
	import '../app.css';
	import PwaToast from './components/pwa-toast.svelte';

	let { children } = $props();
	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html webManifestLink}
</svelte:head>

<Toaster />
<ModeWatcher />

<PwaToast />

<Sidebar.Provider>
	<AppSidebar />
	<main class="p-2">
		<Sidebar.Trigger />
		{@render children?.()}
	</main>
</Sidebar.Provider>
