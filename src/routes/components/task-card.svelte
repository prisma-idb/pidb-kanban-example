<script lang="ts">
	import { client } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { globalState } from '$routes/state.svelte';
	import type { Task } from '@prisma/client';
	import { EllipsisIcon } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { task }: { task: Task } = $props();
	let imageURL = $derived.by(() => {
		if (!task.image) return null;
		return URL.createObjectURL(new Blob([new Uint8Array(task.image)]));
	});

	function changeTaskIsCompleted(completed: boolean) {
		client.task.update({
			where: { id: task.id },
			data: { isCompleted: completed }
		});
	}

	async function deleteTask() {
		await client.task.delete({ where: { id: task.id } });
		toast.success('Task deleted');
	}
</script>

<Card.Root class="rounded-lg bg-secondary">
	<Card.Header class="flex-row items-center justify-between p-4">
		<div class="flex flex-col gap-1">
			<Card.Title>{task.title}</Card.Title>
			{#if task.description}
				<Card.Description>{task.description}</Card.Description>
			{/if}
		</div>
		<div class="!mt-0 flex gap-2">
			<Checkbox checked={task.isCompleted} onCheckedChange={changeTaskIsCompleted} />
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" class="h-fit w-fit p-0" aria-label="Task options">
							<EllipsisIcon />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Group>
						<DropdownMenu.Item onclick={() => (globalState.taskToEdit = task.id)}>
							Edit
						</DropdownMenu.Item>
						<DropdownMenu.Item class="text-red-500" onclick={deleteTask}>Delete</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</Card.Header>
	{#if imageURL}
		<Card.Content class="p-4">
			<img src={imageURL} alt="task" />
		</Card.Content>
	{/if}
</Card.Root>
