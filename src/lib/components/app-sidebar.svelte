<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AddBoardPopover from '$routes/components/add-board-popover.svelte';
	import { PlusIcon } from 'lucide-svelte';
	import PwaButton from '../../routes/components/pwa-button.svelte';
	import Button from './ui/button/button.svelte';
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
										Add board
										<Sidebar.MenuAction>
											<PlusIcon />
										</Sidebar.MenuAction>
									</Sidebar.MenuButton>
								{/snippet}
							</Popover.Trigger>
						</AddBoardPopover>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<PwaButton />
	</Sidebar.Footer>
</Sidebar.Root>
