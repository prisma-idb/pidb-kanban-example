<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import { globalState } from '$routes/state.svelte';
	import type { Prisma } from '@prisma/client';

	type PropsType = { board: Prisma.BoardGetPayload<{ include: { tasks: true } }> };
	let { board }: PropsType = $props();
</script>

<Card.Root class="flex flex-col rounded-md">
	<Card.Header>
		<Card.Title>{board.name}</Card.Title>
		<Card.Description>Card description</Card.Description>
	</Card.Header>
	<Card.Content class="grow">
		{#each board.tasks as task}
			<Card.Root>
				<Card.Header>
					<Card.Title>{task.title}</Card.Title>
					<Card.Description>{task.content}</Card.Description>
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
