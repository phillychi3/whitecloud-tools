<script lang="ts">
	import * as Card from '$lib/components/ui/card'
	import { Button } from '$lib/components/ui/button'
	import Icon from '@iconify/svelte'
	import Navbar from '$lib/components/Navbar.svelte'

	let text = $state('')
	let copySuccess = $state(false)

	let stats = $derived.by(() => {
		const trimmedText = text.trim()

		const characters = text.length

		const charactersNoSpaces = text.replace(/\s/g, '').length

		const words = trimmedText
			? trimmedText.split(/\s+/).filter((word) => word.length > 0).length
			: 0

		const lines = text ? text.split('\n').length : 0

		const paragraphs = trimmedText
			? trimmedText.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
			: 0

		const sentences = trimmedText ? (trimmedText.match(/[.!?。！？]+/g) || []).length : 0

		return {
			characters,
			charactersNoSpaces,
			words,
			lines,
			paragraphs,
			sentences
		}
	})

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

	function clearText() {
		text = ''
	}
</script>

<Navbar />

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<h1 class="text-3xl font-bold mb-6 text-gray-800">文字計數器</h1>

	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>輸入文字</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<textarea
					bind:value={text}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px] font-mono text-sm"
					placeholder="在此輸入或貼上文字..."
				></textarea>

				<div class="flex gap-2">
					<Button onclick={clearText} variant="outline" class="flex-1" disabled={!text}>
						<Icon icon="mdi:delete" class="w-5 h-5" />
						清除
					</Button>
					<Button
						onclick={() => copyToClipboard(text)}
						variant="secondary"
						class="flex-1"
						disabled={!text}
					>
						{#if copySuccess}
							<Icon icon="mdi:check" class="w-5 h-5 text-green-600" />
							<span class="text-green-600">已複製!</span>
						{:else}
							<Icon icon="mdi:content-copy" class="w-5 h-5" />
							<span>複製文字</span>
						{/if}
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>統計結果</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Icon icon="mdi:format-letter-case" class="w-5 h-5 text-gray-600" />
						<span class="text-sm font-medium text-gray-600">字元數</span>
					</div>
					<p class="text-2xl font-bold text-gray-800">{stats.characters.toLocaleString()}</p>
				</div>

				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Icon icon="mdi:format-text" class="w-5 h-5 text-gray-600" />
						<span class="text-sm font-medium text-gray-600">字元數（不含空格）</span>
					</div>
					<p class="text-2xl font-bold text-gray-800">
						{stats.charactersNoSpaces.toLocaleString()}
					</p>
				</div>

				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Icon icon="mdi:text" class="w-5 h-5 text-gray-600" />
						<span class="text-sm font-medium text-gray-600">單字數</span>
					</div>
					<p class="text-2xl font-bold text-gray-800">{stats.words.toLocaleString()}</p>
				</div>

				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Icon icon="mdi:format-line-spacing" class="w-5 h-5 text-gray-600" />
						<span class="text-sm font-medium text-gray-600">行數</span>
					</div>
					<p class="text-2xl font-bold text-gray-800">{stats.lines.toLocaleString()}</p>
				</div>

				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Icon icon="mdi:format-paragraph" class="w-5 h-5 text-gray-600" />
						<span class="text-sm font-medium text-gray-600">段落數</span>
					</div>
					<p class="text-2xl font-bold text-gray-800">{stats.paragraphs.toLocaleString()}</p>
				</div>

				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Icon icon="mdi:format-quote-close" class="w-5 h-5 text-gray-600" />
						<span class="text-sm font-medium text-gray-600">句子數</span>
					</div>
					<p class="text-2xl font-bold text-gray-800">{stats.sentences.toLocaleString()}</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
