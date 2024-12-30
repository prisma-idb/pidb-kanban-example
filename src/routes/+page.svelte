<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import type { Prisma } from '@prisma/client';
	import { PlusIcon } from 'lucide-svelte';
	import AddBoardPopover from './components/add-board-popover.svelte';
	import { client } from '$lib/client';
	import Board from './components/board.svelte';
	import AddTaskDialog from './components/add-task-dialog.svelte';

	let boards: Prisma.BoardGetPayload<{ include: { tasks: true } }>[] = $state([]);

	async function updateBoards() {
		boards = await client!.board.findMany({
			include: { tasks: true }
		});
	}

	$effect(() => {
		updateBoards();
		client!.board.subscribe(['create', 'update', 'delete'], () => {
			updateBoards();
		});
	});
</script>

<AddTaskDialog />

<div class="grid h-full grid-cols-[repeat(auto-fill,_minmax(16rem,_1fr))] gap-2">
	{#each boards as board}
		<Board {board} />
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
