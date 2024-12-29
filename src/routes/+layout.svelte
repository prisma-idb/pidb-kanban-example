<script lang="ts">
	import ModeToggle from '$lib/components/mode-toggle.svelte';
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
<ModeToggle />

{@render children()}
