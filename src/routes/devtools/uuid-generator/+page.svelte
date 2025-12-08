<script lang="ts">
	import { v4, v5 } from 'uuid'
	import * as Card from '$lib/components/ui/card'
	import { Button } from '$lib/components/ui/button'
	import Icon from '@iconify/svelte'
	import Navbar from '$lib/components/Navbar.svelte'
	import toast from 'svelte-french-toast'

	type UUIDVersion = '4' | '5'

	let selectedVersion = $state<UUIDVersion>('4')
	let generatedUUID = $state('')
	let quantity = $state(1)
	let generatedList = $state<string[]>([])
	let namespace = $state('6ba7b810-9dad-11d1-80b4-00c04fd430c8') // DNS namespace
	let name = $state('')
	let copySuccess = $state(false)

	function generateUUID() {
		generatedList = []

		// v5 只生成一個,因為相同的 namespace + name 總是產生相同的 UUID
		const count = selectedVersion === '5' ? 1 : quantity

		for (let i = 0; i < count; i++) {
			let uuid = ''
			switch (selectedVersion) {
				case '4':
					uuid = v4()
					break
				case '5':
					if (!name) {
						toast.error('UUID v5 需要提供名稱')
						return
					}
					uuid = v5(name, namespace)
					break
			}
			generatedList.push(uuid)
		}

		generatedUUID = generatedList.join('\n')
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text)
			copySuccess = true
			setTimeout(() => {
				copySuccess = false
			}, 2000)
		} catch (err) {
			console.error('複製失敗:', err)
		}
	}
</script>

<Navbar />

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<h1 class="text-3xl font-bold mb-6 text-gray-800">UUID 產生器</h1>

	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>設定</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">UUID 版本</label>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
						{#each ['4', '5'] as version}
							<Button
								variant={selectedVersion === version ? 'default' : 'outline'}
								onclick={() => (selectedVersion = version as UUIDVersion)}
							>
								v{version}
							</Button>
						{/each}
					</div>
				</div>

				{#if selectedVersion === '5'}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">命名空間</label>
						<input
							type="text"
							bind:value={namespace}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="6ba7b810-9dad-11d1-80b4-00c04fd430c8"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">名稱</label>
						<input
							type="text"
							bind:value={name}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="輸入要雜湊的名稱"
						/>
					</div>
				{/if}

				{#if selectedVersion === '4'}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							生成數量: {quantity}
						</label>
						<input type="range" bind:value={quantity} min="1" max="50" class="w-full" />
					</div>
				{/if}

				<Button onclick={generateUUID} class="w-full" size="lg">
					<Icon icon="mdi:refresh" class="w-5 h-5" />
					生成 UUID
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	{#if generatedUUID}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>生成結果</Card.Title>
						<Card.Description>已生成 {generatedList.length} 個 UUID</Card.Description>
					</div>
					<Button variant="secondary" onclick={() => copyToClipboard(generatedUUID)}>
						{#if copySuccess}
							<Icon icon="mdi:check" class="w-5 h-5 text-green-600" />
							<span class="text-green-600">已複製!</span>
						{:else}
							<Icon icon="mdi:content-copy" class="w-5 h-5" />
							<span>複製全部</span>
						{/if}
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-2 max-h-96 overflow-y-auto">
					{#each generatedList as uuid, i}
						<div
							class="flex items-center justify-between group hover:bg-gray-100 px-2 py-1 rounded"
						>
							<span class="text-gray-700">{uuid}</span>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => copyToClipboard(uuid)}
								class="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
							>
								<Icon icon="mdi:content-copy" class="w-4 h-4" />
							</Button>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
