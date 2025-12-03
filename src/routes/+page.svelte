<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte'
	import * as Card from '$lib/components/ui/card'

	type Tool = {
		name: string
		url: string
	}
	const TOOLS: Record<string, Tool[]> = {
		FF14: [
			{
				name: 'Mini Cactpot Solver',
				url: '/ff14/mini-cactpot'
			}
		],
		devtools: [
			{
				name: 'JSON Formatter',
				url: '/devtools/json-formatter'
			},
			{
				name: 'UUID Generator',
				url: '/devtools/uuid-generator'
			}
		]
	}
</script>

<Navbar />

<div class="container mx-auto px-4 py-8">
	{#each Object.entries(TOOLS) as [classification, tools]}
		<section class="my-8">
			<h2 class="text-2xl font-bold mb-4 capitalize">{classification}</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each tools as tool}
					<a href={tool.url} class="">
						<Card.Root class="hover:shadow-lg transition-shadow duration-200">
							<Card.Content>
								<h3 class="text-lg font-semibold">{tool.name}</h3>
							</Card.Content>
						</Card.Root>
					</a>
				{/each}
			</div>
		</section>
	{/each}
</div>
