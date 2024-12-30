<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import type { Task } from '@prisma/client';

	let { task }: { task: Task } = $props();
	let imageURL = $derived.by(() => {
		if (!task.image) return null;

		return URL.createObjectURL(new Blob([new Uint8Array(task.image)]));
	});
</script>

<Card.Root class="bg-secondary">
	<Card.Header class="p-4">
		<Card.Title>{task.title}</Card.Title>
		<Card.Description>{task.description}</Card.Description>
	</Card.Header>
	{#if imageURL}
		<Card.Content class="p-4">
			<img src={imageURL} alt="task" />
		</Card.Content>
	{/if}
</Card.Root>
