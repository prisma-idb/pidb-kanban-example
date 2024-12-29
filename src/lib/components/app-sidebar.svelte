<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Button from './ui/button/button.svelte';
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<Button class="h-fit flex-col items-start gap-0" variant="ghost">
			<span class="text-lg font-bold">Svelte Todo</span>
			<span class="text-xs">@prisma-idb/idb-client-generator</span>
		</Button>
	</Sidebar.Header>
	<Sidebar.Content />
</Sidebar.Root>
