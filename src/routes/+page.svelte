<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import { PrismaIDBClient } from '$lib/prisma-idb/prisma-idb-client';
	import type { Todo } from '@prisma/client';
	import AddTodoCard from './components/add-todo-card.svelte';

	let client = $state<PrismaIDBClient>();
	let todos = $state<Todo[]>([]);

	$effect(() => {
		PrismaIDBClient.createClient().then((c) => (client = c));
	});

	$effect(() => {
		client?.todo.findMany().then((v) => (todos = v));
	});
</script>

<AddTodoCard {client} />

<Table.Root>
	<Table.Caption>A list of your todos.</Table.Caption>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-[100px]">ID</Table.Head>
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
				<Table.Cell>{todo.createdAt}</Table.Cell>
				<Table.Cell>{todo.completed ? 'Yes' : 'No'}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
