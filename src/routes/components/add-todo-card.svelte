<script lang="ts">
	import { client } from '$lib/client';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { PlusIcon } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let title = $state('');

	async function addTodo(e: SubmitEvent) {
		e.preventDefault();
		await client!.todo.create({ data: { title } });
		toast.success('Todo added successfully');
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Add a todo</Card.Title>
	</Card.Header>
	<Card.Content>
		<form class="flex w-full flex-col gap-1.5" id="todo-form" name="todo-form" onsubmit={addTodo}>
			<Label for="title">Title</Label>
			<Input id="title" required placeholder="Type here" bind:value={title} />
		</form>
	</Card.Content>
	<Card.Footer class="justify-end">
		<Button type="submit" form="todo-form">
			<PlusIcon /> Add todo
		</Button>
	</Card.Footer>
</Card.Root>
