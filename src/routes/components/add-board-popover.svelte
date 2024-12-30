<script lang="ts">
	import { client } from '$lib/client';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { PlusIcon } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	const isMobile = new IsMobile();

	let open = $state(false);
	let newBoardName = $state('');

	async function addBoard(e: SubmitEvent) {
		e.preventDefault();
		client!.board.create({ data: { name: newBoardName } });
	}
</script>

<Popover.Root bind:open>
	{@render children?.()}
	<Popover.Content side={isMobile.current ? 'bottom' : 'right'}>
		<form class="flex w-full max-w-sm flex-col gap-1.5" onsubmit={addBoard}>
			<Label for="board-name">Board name</Label>
			<Input id="board-name" placeholder="Type here" required bind:value={newBoardName} />
			<Button class="ml-auto w-fit"><PlusIcon />Add</Button>
		</form>
	</Popover.Content>
</Popover.Root>
