<script lang="ts">
	import { client } from '$lib/client';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { globalState } from '$routes/state.svelte';
	import type { Board } from '@prisma/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { z } from 'zod';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { toast } from 'svelte-sonner';

	const taskFormSchema = z.object({
		title: z.string().min(2).max(50),
		description: z.string().optional(),
		image: z.instanceof(File).optional(),
		boardName: z.string().nonempty()
	});

	const form = superForm(defaults(zod(taskFormSchema)), {
		SPA: true,
		validators: zod(taskFormSchema)
	});
	const { form: formData, enhance } = form;

	let open = $state(false);
	let boards: Board[] = $state([]);

	async function updateBoards() {
		boards = await client.board.findMany();
	}

	$effect(() => {
		open = globalState.selectedBoard !== undefined;
		if (globalState.selectedBoard) {
			$formData.boardName = globalState.selectedBoard;
		}
		
		updateBoards();
		client.board.subscribe(['create', 'update', 'delete'], updateBoards);
	});

	async function createTask(e: SubmitEvent) {
		e.preventDefault();
		const arrayBuffer = await $formData.image?.arrayBuffer();
		const uint8Array = arrayBuffer ? new Uint8Array(arrayBuffer) : undefined;

		await client.task.create({
			data: {
				title: $formData.title,
				description: $formData.description,
				image: uint8Array,
				boardName: $formData.boardName
			}
		});
		toast.success('Task created successfully');
		form.reset();
		globalState.selectedBoard = undefined;
	}
</script>

<Sheet.Root bind:open onOpenChange={(v) => !v && (globalState.selectedBoard = undefined)}>
	<Sheet.Content interactOutsideBehavior="ignore">
		<Sheet.Header>
			<Sheet.Title>Add task</Sheet.Title>
		</Sheet.Header>
		<form class="py-4" use:enhance enctype="multipart/form-data" onsubmit={createTask}>
			<Form.Field {form} name="boardName">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>For board</Form.Label>
						<Select.Root type="single" bind:value={$formData.boardName} name={props.name}>
							<Select.Trigger {...props}>
								{$formData.boardName ?? 'Select a verified email to display'}
							</Select.Trigger>
							<Select.Content>
								{#each boards as board}
									<Select.Item value={board.name} label={board.name} />
								{/each}
							</Select.Content>
						</Select.Root>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="title">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Title</Form.Label>
						<Input {...props} bind:value={$formData.title} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="description">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Description</Form.Label>
						<Textarea {...props} bind:value={$formData.description} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="image">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Image</Form.Label>
						<input
							{...props}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							type="file"
							onchange={(c) => ($formData.image = c.currentTarget.files?.item(0) ?? undefined)}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Button class="ml-auto">Submit</Form.Button>
		</form>
	</Sheet.Content>
</Sheet.Root>
