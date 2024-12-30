<script lang="ts">
	import { client } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import { globalState } from '$routes/state.svelte';
	import type { Task, Board } from '@prisma/client';

	type PropsType = { board: Board };
	let { board }: PropsType = $props();
	let tasks = $state<Task[]>([]);

	async function updateTasks() {
		tasks = await client.task.findMany({ where: { boardName: board.name } });
	}

	$effect(() => {
		updateTasks();
		client.task.subscribe(['create', 'update', 'delete'], updateTasks);
	});
</script>

<Card.Root class="flex flex-col rounded-md">
	<Card.Header>
		<Card.Title>{board.name}</Card.Title>
		<Card.Description>Card description</Card.Description>
	</Card.Header>
	<Card.Content class="grow">
		{#each tasks as task}
			<Card.Root>
				<Card.Header>
					<Card.Title>{task.title}</Card.Title>
					<Card.Description>{task.description}</Card.Description>
				</Card.Header>
				<Card.Content>
					<p>Card Content</p>
				</Card.Content>
				<Card.Footer>
					<p>Card Footer</p>
				</Card.Footer>
			</Card.Root>
		{/each}
	</Card.Content>
	<Card.Footer class="justify-end">
		<Button variant="secondary" onclick={() => (globalState.selectedBoard = board.name)}>
			Add task
		</Button>
	</Card.Footer>
</Card.Root>
