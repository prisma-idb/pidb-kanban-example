<script lang="ts">
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import { marked } from 'marked';

	let { data } = $props();

	const htmlReadme = marked.parse(data.readmeText);
</script>

<ScrollArea class="h-px grow">
	<article class="prose dark:prose-invert mx-auto">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html htmlReadme}
	</article>
</ScrollArea>
