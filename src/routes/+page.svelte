<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import type { Board } from '@prisma/client';
	import { PlusIcon } from 'lucide-svelte';
	import AddBoardPopover from './components/add-board-popover.svelte';
	import BoardComponent from './components/board-component.svelte';
	import AddTaskDialog from './components/add-task-sheet.svelte';
	import { client } from '$lib/client';

	let boards: Board[] = $state([]);

	async function updateBoards() {
		boards = await client.board.findMany();
	}

	$effect(() => {
		updateBoards();
		client.board.subscribe(['create', 'update', 'delete'], () => {
			updateBoards();
		});
	});
</script>

<AddTaskDialog />

<div class="grid h-full grid-cols-[repeat(auto-fill,_minmax(16rem,_1fr))] gap-2">
	{#each boards as board}
		<BoardComponent {board} />
	{/each}
	<AddBoardPopover>
		<Popover.Trigger>
			{#snippet child({ props })}
				<Button {...props} class="w-fit" variant="outline" aria-label="add-board">
					<PlusIcon />
				</Button>
			{/snippet}
		</Popover.Trigger>
	</AddBoardPopover>
</div>
