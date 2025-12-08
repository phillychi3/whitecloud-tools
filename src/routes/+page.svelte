<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte'
	import * as Card from '$lib/components/ui/card'

	type Tool = {
		name: string
		url: string
		description: string
		status?: ToolStatus
	}

	type ToolStatus = 'online' | 'maintenance' | 'development'
	const TOOLS: Record<string, Tool[]> = {
		FF14: [
			{
				name: 'Mini Cactpot Solver',
				url: '/ff14/mini-cactpot',
				description: 'Solve your daily Mini Cactpot ticket with ease!',
				status: 'online'
			}
		],
		devtools: [
			{
				name: 'serialization Tool',
				url: '/devtools/serialization-tool',
				description: 'A tool for serializing and deserializing data like JSON, XML, and YAML.',
				status: 'development'
			},
			{
				name: 'UUID Generator',
				url: '/devtools/uuid-generator',
				description: 'Generate unique identifiers (UUIDs).',
				status: 'development'
			},
			{
				name: 'text converter',
				url: '/devtools/text-converter',
				description: 'Convert text between different formats and encodings.',
				status: 'development'
			},
			{
				name: 'IP Subnet Calculator',
				url: '/devtools/ip-subnet-calculator',
				description: 'Calculate and analyze IP subnets.',
				status: 'development'
			}
		],
		security: [
			{
				name: 'caesar',
				url: '/security/caesar',
				description: 'Encrypt and decrypt text using the Caesar cipher.',
				status: 'development'
			},
			{
				name: 'vigenere',
				url: '/security/vigenere',
				description: 'Encrypt and decrypt text using the Vigenère cipher.',
				status: 'development'
			},
			{
				name: 'hash',
				url: '/security/hash',
				description: 'Generate cryptographic hashes like MD5, SHA-1, and SHA-256.',
				status: 'development'
			},
			{
				name: 'jwt tool',
				url: '/security/jwt-tool',
				description: 'Create, decode, modify, and verify JSON Web Tokens (JWT).',
				status: 'development'
			},
			{
				name: 'morse code',
				url: '/security/morse-code',
				description: 'Encode and decode messages using Morse code.',
				status: 'development'
			}
		],
		text: [
			{
				name: 'text diff',
				url: '/text/text-diff',
				description: 'Compare and highlight differences between text files.',
				status: 'development'
			},
			{
				name: 'word counter',
				url: '/text/word-counter',
				description: 'Count words, characters, and lines in your text.',
				status: 'development'
			}
		]
	}
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
												>維護中</span
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
