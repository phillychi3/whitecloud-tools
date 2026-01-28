<script lang="ts">
	import * as Card from '$lib/components/ui/card'
	import { Button } from '$lib/components/ui/button'
	import Icon from '@iconify/svelte'
	import Navbar from '$lib/components/Navbar.svelte'
	import toast from 'svelte-french-toast'

	type ConversionType =
		| 'uppercase'
		| 'lowercase'
		| 'titlecase'
		| 'base64-encode'
		| 'base64-decode'
		| 'url-encode'
		| 'url-decode'
		| 'html-encode'
		| 'html-decode'
		| 'unicode-escape'
		| 'unicode-unescape'
		| 'json-format'
		| 'json-minify'
		| 'remove-whitespace'
		| 'remove-newlines'

	let inputText = $state('')
	let outputText = $state('')
	let selectedConversion = $state<ConversionType>('uppercase')
	let copySuccess = $state(false)

	const conversions = [
		{ value: 'uppercase', label: '大寫', icon: 'mdi:format-letter-case-upper' },
		{ value: 'lowercase', label: '小寫', icon: 'mdi:format-letter-case-lower' },
		{ value: 'titlecase', label: '標題大小寫', icon: 'mdi:format-letter-case' },
		{ value: 'base64-encode', label: 'Base64 編碼', icon: 'mdi:code-braces' },
		{ value: 'base64-decode', label: 'Base64 解碼', icon: 'mdi:code-braces' },
		{ value: 'url-encode', label: 'URL 編碼', icon: 'mdi:link-variant' },
		{ value: 'url-decode', label: 'URL 解碼', icon: 'mdi:link-variant' },
		{ value: 'html-encode', label: 'HTML 編碼', icon: 'mdi:language-html5' },
		{ value: 'html-decode', label: 'HTML 解碼', icon: 'mdi:language-html5' },
		{ value: 'unicode-escape', label: 'Unicode 轉義', icon: 'mdi:unicode' },
		{ value: 'unicode-unescape', label: 'Unicode 反轉義', icon: 'mdi:unicode' },
		{ value: 'json-format', label: 'JSON 格式化', icon: 'mdi:code-json' },
		{ value: 'json-minify', label: 'JSON 壓縮', icon: 'mdi:code-json' },
		{ value: 'remove-whitespace', label: '移除所有空白', icon: 'mdi:format-clear' },
		{ value: 'remove-newlines', label: '移除換行', icon: 'mdi:format-clear' }
	]

	function removeJsonComments(text: string): string {
		let result = text.replace(/\/\/.*$/gm, '')
		result = result.replace(/\/\*[\s\S]*?\*\//g, '')
		result = result.replace(/,(\s*[}\]])/g, '$1')
		return result
	}

	function convert() {
		try {
			switch (selectedConversion) {
				case 'uppercase':
					outputText = inputText.toUpperCase()
					break
				case 'lowercase':
					outputText = inputText.toLowerCase()
					break
				case 'titlecase':
					outputText = inputText.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
					break
				case 'base64-encode':
					outputText = btoa(unescape(encodeURIComponent(inputText)))
					break
				case 'base64-decode':
					outputText = decodeURIComponent(escape(atob(inputText)))
					break
				case 'url-encode':
					outputText = encodeURIComponent(inputText)
					break
				case 'url-decode':
					outputText = decodeURIComponent(inputText)
					break
				case 'html-encode':
					outputText = inputText
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;')
						.replace(/"/g, '&quot;')
						.replace(/'/g, '&#039;')
					break
				case 'html-decode':
					outputText = inputText
						.replace(/&amp;/g, '&')
						.replace(/&lt;/g, '<')
						.replace(/&gt;/g, '>')
						.replace(/&quot;/g, '"')
						.replace(/&#039;/g, "'")
					break
				case 'unicode-escape':
					outputText = inputText
						.split('')
						.map((char) => {
							const code = char.charCodeAt(0)
							return code > 127 ? '\\u' + code.toString(16).padStart(4, '0') : char
						})
						.join('')
					break
				case 'unicode-unescape':
					outputText = inputText.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
						String.fromCharCode(parseInt(hex, 16))
					)
					break
				case 'json-format':
					const cleanedJson = removeJsonComments(inputText)
					const parsed = JSON.parse(cleanedJson)
					outputText = JSON.stringify(parsed, null, 2)
					break
				case 'json-minify':
					const cleanedJsonMin = removeJsonComments(inputText)
					const parsedMin = JSON.parse(cleanedJsonMin)
					outputText = JSON.stringify(parsedMin)
					break
				case 'remove-whitespace':
					outputText = inputText.replace(/\s+/g, '')
					break
				case 'remove-newlines':
					outputText = inputText.replace(/\n/g, '')
					break
			}
		} catch (err) {
			toast.error('轉換失敗: ' + (err as Error).message)
		}
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text)
			copySuccess = true
			setTimeout(() => {
				copySuccess = false
			}, 2000)
		} catch (err) {
			toast.error('複製失敗')
		}
	}

	function swapTexts() {
		const temp = inputText
		inputText = outputText
		outputText = temp
	}

	function clearAll() {
		inputText = ''
		outputText = ''
	}

	// 自動轉換
	$effect(() => {
		if (inputText) {
			convert()
		} else {
			outputText = ''
		}
	})
</script>

<Navbar />

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<h1 class="text-3xl font-bold mb-6 text-gray-800">文字轉換器</h1>

	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>轉換類型</Card.Title>
			<Card.Description>選擇要執行的轉換操作</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
				{#each conversions as conversion}
					<Button
						variant={selectedConversion === conversion.value ? 'default' : 'outline'}
						onclick={() => (selectedConversion = conversion.value as ConversionType)}
						class="justify-start"
					>
						<Icon icon={conversion.icon} class="w-4 h-4" />
						<span class="text-xs">{conversion.label}</span>
					</Button>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid md:grid-cols-2 gap-6 mb-6">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>輸入文字</Card.Title>
					<Button
						variant="ghost"
						size="icon"
						onclick={clearAll}
						disabled={!inputText && !outputText}
					>
						<Icon icon="mdi:delete" class="w-5 h-5" />
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				<textarea
					bind:value={inputText}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px] font-mono text-sm"
					placeholder="在此輸入要轉換的文字..."
				></textarea>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>輸出結果</Card.Title>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => copyToClipboard(outputText)}
						disabled={!outputText}
					>
						{#if copySuccess}
							<Icon icon="mdi:check" class="w-5 h-5 text-green-600" />
						{:else}
							<Icon icon="mdi:content-copy" class="w-5 h-5" />
						{/if}
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				<textarea
					bind:value={outputText}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px] font-mono text-sm bg-gray-50"
					placeholder="轉換結果將顯示在這裡..."
					readonly
				></textarea>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="flex gap-3 justify-center">
		<Button onclick={swapTexts} variant="outline" size="lg" disabled={!outputText}>
			<Icon icon="mdi:swap-vertical" class="w-5 h-5" />
			交換
		</Button>
	</div>
</div>
