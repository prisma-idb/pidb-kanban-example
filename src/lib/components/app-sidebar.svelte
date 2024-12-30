<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AddBoardPopover from '$routes/components/add-board-popover.svelte';
	import {
		BeanIcon,
		GithubIcon,
		GlobeIcon,
		InfoIcon,
		PlusIcon,
		RotateCcwIcon
	} from 'lucide-svelte';
	import PwaButton from '../../routes/components/pwa-button.svelte';
	import Button from './ui/button/button.svelte';
	import { client } from '$lib/client';

	async function reset() {
		await client.board.deleteMany();
	}

	async function seedDummyData() {
		await client.board.create({
			data: {
				name: 'Grocery list',
				tasks: {
					create: [{ title: 'Buy milk' }, { title: 'Buy eggs' }, { title: 'Buy bread' }]
				}
			}
		});
		await client.board.create({
			data: {
				name: 'Blog',
				tasks: {
					create: [{ title: 'Write blog post' }, { title: 'Write documentation' }]
				}
			}
		});
		await client.board.create({
			data: {
				name: 'Food',
				tasks: {
					create: [{ title: 'Eat breakfast' }, { title: 'Eat lunch' }, { title: 'Eat dinner' }]
				}
			}
		});
	}
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<Button class="h-fit flex-col items-start gap-0" variant="ghost" href="/">
			<span class="text-lg font-bold">PIDB Kanban</span>
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
						<Sidebar.MenuButton onclick={seedDummyData}>
							<BeanIcon />
							Seed dummy data
						</Sidebar.MenuButton>
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
		<Sidebar.Group>
			<Sidebar.GroupLabel>About</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuButton>
						{#snippet child({ props })}
							<a href="/readme" {...props}>
								<InfoIcon />
								<span>README</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
					<Sidebar.MenuButton>
						{#snippet child({ props })}
							<a href="https://github.com/prisma-idb/pidb-kanban-example" {...props}>
								<GlobeIcon />
								<span>Website github</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
					<Sidebar.MenuButton>
						{#snippet child({ props })}
							<a href="https://github.com/prisma-idb/idb-client-generator" {...props}>
								<GithubIcon />
								<span>Package github</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<PwaButton />
	</Sidebar.Footer>
</Sidebar.Root>
