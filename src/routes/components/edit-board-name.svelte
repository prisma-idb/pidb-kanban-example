<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { globalState } from '$routes/state.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button';
	import { client } from '$lib/client';
	import { toast } from 'svelte-sonner';

	let open = $state(false);
	let newBoardName = $state('');

	$effect(() => {
		open = globalState.boardToEdit !== undefined;
	});

	async function editBoard(e: SubmitEvent) {
		e.preventDefault();
		try {
			await client.board.update({
				where: { name: globalState.boardToEdit },
				data: { name: newBoardName }
			});
		} catch (error) {
			if (error instanceof Error) toast.error(error.message);
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={(o) => !o && (globalState.boardToEdit = undefined)}>
	<Sheet.Content interactOutsideBehavior="ignore">
		<Sheet.Header>
			<Sheet.Title>Edit board</Sheet.Title>
			<Sheet.Description>
				Current name: <span class="font-semibold">{globalState.boardToEdit}</span>
			</Sheet.Description>
		</Sheet.Header>
		<form class="mt-4 flex w-full max-w-sm flex-col gap-1.5 py-4" onsubmit={editBoard}>
			<Label for="new-name">New name</Label>
			<Input id="new-name" placeholder="Type here" required bind:value={newBoardName} />
			<Button class="ml-auto w-fit" type="submit">Edit</Button>
		</form>
	</Sheet.Content>
</Sheet.Root>
