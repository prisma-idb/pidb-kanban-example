<script lang="ts">
	import { client } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import type { Task } from '@prisma/client';
	import { EllipsisIcon } from 'lucide-svelte';

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
			<Button variant="ghost" class="h-fit w-fit p-0">
				<EllipsisIcon />
			</Button>
		</div>
	</Card.Header>
	{#if imageURL}
		<Card.Content class="p-4">
			<img src={imageURL} alt="task" />
		</Card.Content>
	{/if}
</Card.Root>
