<script lang="ts">
	import { client } from '$lib/client';
	import * as Table from '$lib/components/ui/table/index.js';
	import type { Todo } from '@prisma/client';

	let todos = $state<Todo[]>([]);

	$effect(() => {
		client!.todo.findMany().then((v) => (todos = v));
	});
</script>

<Table.Root>
	<Table.Caption>A list of your todos.</Table.Caption>
	<Table.Header>
		<Table.Row>
			<Table.Head>ID</Table.Head>
			<Table.Head>Title</Table.Head>
			<Table.Head>Created at</Table.Head>
			<Table.Head>Done</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each todos as todo (todo.id)}
			<Table.Row>
				<Table.Cell>{todo.id}</Table.Cell>
				<Table.Cell>{todo.title}</Table.Cell>
				<Table.Cell>
					{todo.createdAt.toLocaleString(undefined, {
						dateStyle: 'short',
						timeStyle: 'short'
					})}
				</Table.Cell>
				<Table.Cell>{todo.completed ? 'Yes' : 'No'}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
