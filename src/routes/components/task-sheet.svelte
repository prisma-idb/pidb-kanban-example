<script lang="ts">
	import { client } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { globalState } from '$routes/state.svelte';
	import type { Board } from '@prisma/client';
	import { toast } from 'svelte-sonner';
	import { zod } from 'sveltekit-superforms/adapters';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { z } from 'zod';

	let mode = $derived(globalState.taskToEdit ? 'Edit' : 'Add');

	const taskFormSchema = z.object({
		title: z.string().min(2).max(50),
		description: z.string().optional(),
		image: z.instanceof(File).optional(),
		boardName: z.string().nonempty()
	});

	const form = superForm(defaults(zod(taskFormSchema)), {
		SPA: true,
		validators: zod(taskFormSchema),
		onUpdate({ form }) {
			if (form.valid) {
				if (mode === 'Add') createTask();
				else if (mode === 'Edit') editTask();
			}
			form.errors = form.errors;
		}
	});
	const { form: formData, enhance } = form;

	let open = $state(false);
	let boards: Board[] = $state([]);

	$effect(() => {
		open = globalState.boardToAddTaskTo !== undefined || globalState.taskToEdit !== undefined;
		if (globalState.boardToAddTaskTo) $formData.boardName = globalState.boardToAddTaskTo;

		updateBoards();
		client.board.subscribe(['create', 'update', 'delete'], updateBoards);
	});

	$effect(() => {
		if (globalState.taskToEdit) updateFormFields();
		else form.reset();
	});

	async function updateBoards() {
		boards = await client.board.findMany();
	}

	async function updateFormFields() {
		const task = await client.task.findUniqueOrThrow({
			where: { id: globalState.taskToEdit }
		});

		$formData.title = task.title;
		$formData.description = task.description ?? undefined;
		$formData.boardName = task.boardName;
		if (task.image) $formData.image = new File([task.image], 'image');
	}

	async function createTask() {
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
		globalState.boardToAddTaskTo = undefined;
	}

	async function editTask() {
		const arrayBuffer = await $formData.image?.arrayBuffer();
		const uint8Array = arrayBuffer ? new Uint8Array(arrayBuffer) : null;

		await client.task.update({
			where: { id: globalState.taskToEdit },
			data: {
				title: $formData.title,
				description: $formData.description,
				image: uint8Array,
				boardName: $formData.boardName
			}
		});
		toast.success('Task edited successfully');
		form.reset();
		globalState.taskToEdit = undefined;
	}

	function onOpenChange(v: boolean) {
		if (v) return;
		globalState.boardToAddTaskTo = undefined;
		globalState.taskToEdit = undefined;
	}

	function getSrcUrlFromImageFile(image: File) {
		return URL.createObjectURL(image);
	}
</script>

<Sheet.Root bind:open {onOpenChange}>
	<Sheet.Content interactOutsideBehavior="ignore">
		<Sheet.Header>
			<Sheet.Title>{mode} task</Sheet.Title>
		</Sheet.Header>
		<form class="py-4" use:enhance enctype="multipart/form-data">
			<Form.Field {form} name="boardName">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>For board</Form.Label>
						<Select.Root type="single" bind:value={$formData.boardName} name={props.name} required>
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
			{#if !$formData.image}
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
			{:else}
				{@const image = $formData.image}
				<Form.Field {form} name="image">
					<Form.Control>
						{#snippet children()}
							<Form.Label>Image</Form.Label>
							<img
								src={getSrcUrlFromImageFile(image)}
								alt="task"
								class="h-40 w-full rounded-md object-cover"
							/>
							<Button
								variant="destructive"
								class="mt-2"
								onclick={() => ($formData.image = undefined)}
							>
								Remove image
							</Button>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			{/if}
			<Form.Button class="ml-auto">Submit</Form.Button>
		</form>
	</Sheet.Content>
</Sheet.Root>
