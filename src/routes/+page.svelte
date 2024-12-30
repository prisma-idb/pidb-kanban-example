<script lang="ts">
	import { client } from '$lib/client';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import type { Board } from '@prisma/client';
	import { PlusIcon } from 'lucide-svelte';
	import AddBoardPopover from './components/add-board-popover.svelte';
	import BoardComponent from './components/board-component.svelte';
	import EditBoardName from './components/edit-board-name.svelte';
	import TaskSheet from './components/task-sheet.svelte';

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

<TaskSheet />
<EditBoardName />

<div class="flex grow">
	<ScrollArea class="w-px grow" orientation="both">
		<div class="grid h-full grow auto-cols-[minmax(16rem,1fr)] grid-flow-col gap-2 overflow-x-auto">
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
	</ScrollArea>
</div>
