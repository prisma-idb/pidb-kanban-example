<script lang="ts">
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';

	let { children } = $props();
</script>

<ModeWatcher />
<ModeToggle />

{@render children()}
