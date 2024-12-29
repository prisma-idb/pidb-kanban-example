<script lang="ts">
	import ModeToggle from '$lib/components/mode-toggle.svelte';
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

<ModeWatcher />
<ModeToggle />

{@render children()}
