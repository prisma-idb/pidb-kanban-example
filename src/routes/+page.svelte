<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { PlusIcon } from 'lucide-svelte';
	import AddBoardPopover from './components/add-board-popover.svelte';
</script>

<div class="grid grid-cols-[repeat(auto-fill,_minmax(16rem,_1fr))] gap-4">
	<AddBoardPopover>
		<Popover.Trigger>
			{#snippet child({ props })}
				<Button {...props} class="w-fit" variant="outline" aria-label="add-board">
					<PlusIcon />
				</Button>
			{/snippet}
		</Popover.Trigger>
	</AddBoardPopover>
</div>
