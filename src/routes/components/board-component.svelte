<script lang="ts">
	import { client } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import { globalState } from '$routes/state.svelte';
	import type { Task, Board } from '@prisma/client';
	import TaskCard from './task-card.svelte';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';

	let { board }: { board: Board } = $props();
	let tasks = $state<Task[]>([]);

	async function updateTasks() {
		tasks = await client.task.findMany({ where: { boardName: board.name } });
	}

	$effect(() => {
		updateTasks();
		client.task.subscribe(['create', 'update', 'delete'], updateTasks);
	});
</script>

<Card.Root class="flex grow flex-col rounded-md">
	<Card.Header>
		<Card.Title>{board.name}</Card.Title>
		<Card.Description>Card description</Card.Description>
	</Card.Header>
	<ScrollArea class="h-px grow overflow-y-auto pb-4">
		<Card.Content class="flex flex-col gap-2">
			{#each tasks as task}
				<TaskCard {task} />
			{/each}
		</Card.Content>
	</ScrollArea>
	<Card.Footer class="shrink-0 justify-end">
		<Button onclick={() => (globalState.selectedBoard = board.name)}>Add task</Button>
	</Card.Footer>
</Card.Root>
