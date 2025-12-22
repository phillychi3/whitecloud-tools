<script lang="ts">
	import ImageEditor from '$lib/components/ImageEditor.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import { Input } from '$lib/components/ui/input'
	import { Label } from '$lib/components/ui/label'
	import { toast } from 'svelte-french-toast'
	import { onMount } from 'svelte'
	import Navbar from '$lib/components/Navbar.svelte'

	let apiKey = $state('')
	let mainImage = $state<string | undefined>(undefined)
	let referenceImage = $state<string | undefined>(undefined)
	let cropData = $state<
		| {
				x: number
				y: number
				width: number
				height: number
				imageWidth: number
				imageHeight: number
		  }
		| undefined
	>(undefined)
	let resultImage = $state<string | undefined>(undefined)
	let additionalPrompt = $state('')
	let isLoading = $state(false)

	let noApiKeyData = $state<{
		mainImageBase64: string
		maskImageBase64: string
		referenceImageBase64: string
		generatedPrompt: string
		instructions: string
	} | null>(null)

	const basePrompt = '根據參考圖片，將框選區域替換為相似的內容。保持整體風格和諧一致。'

	onMount(() => {
		apiKey = localStorage.getItem('google-ai-api-key') || ''
	})

	function handleMainImageSelect(e: Event) {
		const target = e.target as HTMLInputElement
		const file = target.files?.[0]
		if (file) {
			mainImage = URL.createObjectURL(file)
			cropData = undefined
			resultImage = undefined
		}
	}

	function handleReferenceImageSelect(e: Event) {
		const target = e.target as HTMLInputElement
		const file = target.files?.[0]
		if (file) {
			referenceImage = URL.createObjectURL(file)
		}
	}

	function handleApiKeyChange(e: Event) {
		const target = e.target as HTMLInputElement
		apiKey = target.value
		localStorage.setItem('google-ai-api-key', apiKey)
	}

	async function handleGenerate() {
		if (!mainImage || !cropData || !referenceImage) {
			toast.error('請確保已上傳主圖片、裁切區域、上傳參考圖片')
			return
		}

		isLoading = true
		noApiKeyData = null
		resultImage = undefined

		try {
			const mainImageResponse = await fetch(mainImage)
			const mainImageBlob = await mainImageResponse.blob()

			console.log('裁切資料:', cropData)

			const img = new Image()
			img.crossOrigin = 'anonymous'

			const imageLoadPromise = new Promise<void>((resolve, reject) => {
				img.onload = () => {
					console.log('圖片載入完成:', img.width, 'x', img.height)
					resolve()
				}
				img.onerror = reject
			})

			img.src = mainImage
			await imageLoadPromise

			const canvas = document.createElement('canvas')
			canvas.width = img.width
			canvas.height = img.height
			const ctx = canvas.getContext('2d')

			if (!ctx) {
				toast.error('無法創建畫布')
				isLoading = false
				return
			}

			console.log('畫布尺寸:', canvas.width, 'x', canvas.height)

			ctx.fillStyle = 'black'
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			ctx.fillStyle = 'white'

			if (!cropData.imageWidth || !cropData.imageHeight) {
				console.log('直接使用裁切座標')
				ctx.fillRect(cropData.x, cropData.y, cropData.width, cropData.height)
			} else {
				const scaleX = img.width / cropData.imageWidth
				const scaleY = img.height / cropData.imageHeight
				const x = cropData.x * scaleX
				const y = cropData.y * scaleY
				const width = cropData.width * scaleX
				const height = cropData.height * scaleY

				console.log('繪製白色區域:', { x, y, width, height })
				ctx.fillRect(x, y, width, height)
			}

			console.log('生成遮罩:', {
				canvasSize: { width: canvas.width, height: canvas.height },
				cropArea: cropData
			})

			const maskBlob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(
					(blob) => {
						if (blob) {
							console.log('遮罩生成成功:', blob.size, 'bytes')
							resolve(blob)
						} else {
							reject(new Error('無法生成遮罩'))
						}
					},
					'image/png',
					1.0
				)
			})

			const refResponse = await fetch(referenceImage)
			const refBlob = await refResponse.blob()

			const fullPrompt = additionalPrompt ? `${basePrompt} ${additionalPrompt}` : basePrompt

			const formData = new FormData()
			formData.append('mainImage', mainImageBlob)
			formData.append('maskImage', maskBlob)
			formData.append('referenceImage', refBlob)
			formData.append('prompt', fullPrompt)
			if (apiKey) {
				formData.append('apiKey', apiKey)
			}

			const response = await fetch('/image/ai-replace/api', {
				method: 'POST',
				body: formData
			})

			if (response.ok) {
				const contentType = response.headers.get('content-type')
				console.log('Response content-type:', contentType)

				if (contentType?.includes('application/json')) {
					const data = await response.json()
					console.log('Received JSON data:', data)
					noApiKeyData = data
				} else {
					const newImageBlob = await response.blob()
					resultImage = URL.createObjectURL(newImageBlob)
				}
			} else {
				const errorText = await response.text()
				console.error('Failed to replace image:', errorText)
				toast.error(`圖片替換失敗: ${errorText}`)
			}
		} catch (error) {
			console.error('Error during image replacement:', error)
			toast.error('發生錯誤，請查看控制台')
		} finally {
			isLoading = false
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text)
		toast.success('已複製到剪貼簿')
	}

	async function copyImageToClipboard(base64: string) {
		try {
			const response = await fetch(`data:image/png;base64,${base64}`)
			const blob = await response.blob()

			await navigator.clipboard.write([
				new ClipboardItem({
					[blob.type]: blob
				})
			])

			toast.success('圖片已複製到剪貼簿')
		} catch (error) {
			console.error('複製圖片失敗:', error)
			toast.error('複製圖片失敗，請確保瀏覽器支援此功能')
		}
	}
</script>

<Navbar />
<div class="container mx-auto p-4 max-w-7xl">
	<h1 class="text-3xl font-bold mb-6">AI 圖片替換工具</h1>

	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>API Token 設定</Card.Title>
			<Card.Description>
				請輸入您的 Google AI API Token，token將儲存在您的瀏覽器中。如果不輸入 API
				Token則需要手動貼在gemini等工具中使用
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Input
				type="password"
				bind:value={apiKey}
				oninput={handleApiKeyChange}
				placeholder="輸入 API Token（選填）"
			/>
		</Card.Content>
	</Card.Root>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>步驟 1：上傳並框選主圖片</Card.Title>
				<Card.Description>上傳需要修改的圖片，然後使用編輯器框選想要替換的區域</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div>
					<Label for="main-image">選擇主圖片</Label>
					<Input
						id="main-image"
						type="file"
						onchange={handleMainImageSelect}
						accept="image/*"
						class="mt-2"
					/>
				</div>

				{#if mainImage}
					<div class="mt-4 border rounded-lg overflow-hidden">
						<ImageEditor bind:src={mainImage} bind:cropData />
					</div>
					{#if cropData}
						<p class="text-sm text-green-600 mt-2">
							✓ 已裁切區域 ({cropData.width}x{cropData.height})
						</p>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>步驟 2：上傳參考圖片並生成</Card.Title>
				<Card.Description>上傳正確的參考圖片（例如：正確的衣服樣式、髮飾等）</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div>
					<Label for="reference-image">選擇參考圖片</Label>
					<Input
						id="reference-image"
						type="file"
						onchange={handleReferenceImageSelect}
						accept="image/*"
						class="mt-2"
					/>
				</div>

				{#if referenceImage}
					<div class="mt-4">
						<Label>參考圖片預覽</Label>
						<img
							src={referenceImage}
							alt="參考圖片"
							class="mt-2 rounded-lg border max-h-48 w-auto object-contain"
						/>
					</div>
				{/if}

				<div>
					<Label for="additional-prompt">額外提示詞（選填）</Label>
					<Input
						id="additional-prompt"
						bind:value={additionalPrompt}
						placeholder="例如：保持原有的光影效果"
						class="mt-2"
					/>
					<p class="text-xs text-muted-foreground mt-1">
						系統預設提示：{basePrompt}
					</p>
				</div>

				<Button
					onclick={handleGenerate}
					disabled={!mainImage || !cropData || !referenceImage || isLoading}
					class="w-full"
				>
					{#if isLoading}
						生成中...
					{:else if apiKey}
						開始生成
					{:else}
						生成素材（無 API key 模式）
					{/if}
				</Button>

				{#if resultImage}
					<div class="mt-4">
						<Label>生成結果</Label>
						<img src={resultImage} alt="生成結果" class="mt-2 rounded-lg border w-full" />
					</div>
				{/if}

				{#if noApiKeyData}
					<div class="mt-4 space-y-4">
						<div class="p-4 rounded-lg">
							<h3 class="font-semibold text-blue-900 mb-2">無 API Key 模式</h3>
							<p class="text-sm text-blue-700 mb-3">
								{noApiKeyData.instructions}
							</p>

							<div class="space-y-3">
								<div>
									<Label class="text-blue-900">生成提示詞</Label>
									<div class="flex gap-2 mt-1">
										<Input
											value={noApiKeyData.generatedPrompt}
											readonly
											class="font-mono text-sm"
										/>
										<Button
											onclick={() => copyToClipboard(noApiKeyData!.generatedPrompt)}
											variant="outline"
											size="sm"
										>
											複製
										</Button>
									</div>
								</div>

								<div>
									<div class="flex justify-between items-center">
										<Label class="text-blue-900">1. 原圖</Label>
										<Button
											onclick={() => copyImageToClipboard(noApiKeyData!.mainImageBase64)}
											variant="outline"
											size="sm"
										>
											複製圖片
										</Button>
									</div>
									<img
										src={`data:image/png;base64,${noApiKeyData.mainImageBase64}`}
										alt="原圖"
										class="mt-2 rounded border max-h-48 w-auto object-contain"
									/>
								</div>

								<div>
									<div class="flex justify-between items-center">
										<Label class="text-blue-900">2. 遮罩圖</Label>
										<Button
											onclick={() => copyImageToClipboard(noApiKeyData!.maskImageBase64)}
											variant="outline"
											size="sm"
										>
											複製圖片
										</Button>
									</div>
									<img
										src={`data:image/png;base64,${noApiKeyData.maskImageBase64}`}
										alt="遮罩圖"
										class="mt-2 rounded border max-h-48 w-auto object-contain"
									/>
								</div>

								<!-- 參考圖 -->
								<div>
									<div class="flex justify-between items-center">
										<Label class="text-blue-900">3. 參考圖</Label>
										<Button
											onclick={() => copyImageToClipboard(noApiKeyData!.referenceImageBase64)}
											variant="outline"
											size="sm"
										>
											複製圖片
										</Button>
									</div>
									<img
										src={`data:image/png;base64,${noApiKeyData.referenceImageBase64}`}
										alt="參考圖"
										class="mt-2 rounded border max-h-48 w-auto object-contain"
									/>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
