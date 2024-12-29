<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { toast } from 'svelte-sonner';
	import type { Writable } from 'svelte/store';

	let needRefresh: Writable<boolean>;
	let offlineReady: Writable<boolean>;
	let updateServiceWorker: () => void;

	$effect(() => {
		({ needRefresh, updateServiceWorker, offlineReady } = useRegisterSW({
			onRegistered(r) {
				if (r) {
					setInterval(() => {
						console.log('Checking for sw update');
						r.update();
					}, 20000);
				}
				console.log(`SW Registered: ${r}`);
			},
			onRegisterError(error) {
				console.log('SW registration error', error);
			}
		}));
	});

	$effect(() => {
		if ($offlineReady) {
			console.log('App is offline ready');
		}
	});

	$effect(() => {
		if ($needRefresh) {
			toast('An update is available', {
				action: { label: 'Update', onClick: () => updateServiceWorker() }
			});
		}
	});
</script>
