<script lang="ts">
	import { client } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import { globalState } from '$routes/state.svelte';
	import type { Board, Task } from '@prisma/client';
	import { MenuIcon } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import TaskCard from './task-card.svelte';

	let { board }: { board: Board } = $props();
	let tasks = $state<Task[]>([]);

	async function updateTasks() {
		tasks = await client.task.findMany({ where: { boardName: board.name } });
	}

	$effect(() => {
		updateTasks();
		client.task.subscribe(['create', 'update', 'delete'], updateTasks);
	});

	async function deleteBoard() {
		await client.board.delete({ where: { name: board.name } });
	}

	async function markAllAsDone() {
		await client.task.updateMany({
			where: { boardName: board.name },
			data: { isCompleted: true }
		});
	}
</script>

<Card.Root class="flex grow flex-col rounded-md">
	<Card.Header class="flex-row items-start justify-between">
		<div class="flex flex-col gap-1">
			<Card.Title>{board.name}</Card.Title>
			<Card.Description>
				{tasks.filter((task) => task.isCompleted).length}/{tasks.length} tasks completed
			</Card.Description>
		</div>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" class="!mt-0 h-fit w-fit p-2">
						<MenuIcon />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				<DropdownMenu.Group>
					<DropdownMenu.Item>Edit</DropdownMenu.Item>
					<DropdownMenu.Item onclick={deleteBoard}>Delete</DropdownMenu.Item>
					<DropdownMenu.Item onclick={markAllAsDone}>Mark all as done</DropdownMenu.Item>
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Card.Header>
	<ScrollArea class="h-px grow overflow-y-auto py-4">
		<Card.Content class="flex flex-col gap-2 py-0">
			{#each tasks as task}
				<TaskCard {task} />
			{/each}
		</Card.Content>
	</ScrollArea>
	<Card.Footer class="shrink-0 justify-end">
		<Button onclick={() => (globalState.selectedBoard = board.name)}>Add task</Button>
	</Card.Footer>
</Card.Root>
