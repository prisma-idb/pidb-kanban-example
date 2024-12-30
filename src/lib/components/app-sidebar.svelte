<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AddBoardPopover from '$routes/components/add-board-popover.svelte';
	import { PlusIcon, RotateCcwIcon } from 'lucide-svelte';
	import PwaButton from '../../routes/components/pwa-button.svelte';
	import Button from './ui/button/button.svelte';
	import { client } from '$lib/client';

	async function reset() {
		await client!.board.deleteMany();
	}
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<Button class="h-fit flex-col items-start gap-0" variant="ghost">
			<span class="text-lg font-bold">Svelte Kanban</span>
			<span class="text-xs">@prisma-idb/idb-client-generator</span>
		</Button>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Actions</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<AddBoardPopover>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Sidebar.MenuButton {...props}>
										<PlusIcon />
										Add board
									</Sidebar.MenuButton>
								{/snippet}
							</Popover.Trigger>
						</AddBoardPopover>
					</Sidebar.MenuItem>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton onclick={reset}>
							<RotateCcwIcon />
							Reset
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<PwaButton />
	</Sidebar.Footer>
</Sidebar.Root>
