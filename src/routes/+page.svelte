<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte'
	import * as Card from '$lib/components/ui/card'
	import { TOOLS } from '$lib/tools'
</script>

<Navbar />

<div class="container mx-auto px-4 py-8">
	{#each Object.entries(TOOLS) as [classification, tools]}
		<section class="my-8">
			<h2 class="text-2xl font-bold mb-4 capitalize">{classification}</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
				{#each tools as tool}
					{#if tool.status === 'development'}
						<div class="cursor-not-allowed">
							<Card.Root class="bg-gray-100 opacity-60">
								<Card.Content>
									<div class="flex items-center justify-between mb-2">
										<h3 class="text-lg font-semibold text-gray-500">{tool.name}</h3>
										<span class="text-xs px-2 py-1 rounded-full bg-gray-300 text-gray-600"
											>開發中</span
										>
									</div>
									<p class="text-sm text-gray-400">{tool.description}</p>
								</Card.Content>
							</Card.Root>
						</div>
					{:else}
						<a href={tool.url} class="block">
							<Card.Root
								class="hover:shadow-lg transition-shadow duration-200 {tool.status === 'maintenance'
									? 'border-yellow-400 border-2'
									: ''}"
							>
								<Card.Content>
									<div class="flex items-center justify-between mb-2">
										<h3 class="text-lg font-semibold">{tool.name}</h3>
										{#if tool.status === 'maintenance'}
											<span class="text-xs px-2 py-1 rounded-full bg-yellow-200 text-yellow-800"
												>不穩定</span
											>
										{/if}
									</div>
									<p class="text-sm text-gray-600">{tool.description}</p>
								</Card.Content>
							</Card.Root>
						</a>
					{/if}
				{/each}
			</div>
		</section>
	{/each}
</div>
