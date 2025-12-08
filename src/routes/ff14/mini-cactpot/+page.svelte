<script lang="ts">
	import { onMount } from 'svelte'
	import ssim from 'ssim.js'
	import Icon from '@iconify/svelte'

	interface Circle {
		x: number
		y: number
		radius: number
	}

	interface Region {
		pixels: number[]
		centerX: number
		centerY: number
		radius: number
		minX: number
		maxX: number
		minY: number
		maxY: number
	}

	// interface DebugInfo {
	//   position: { row: number; col: number };
	//   cropImage: string;
	//   grayImage: string;
	//   isEmpty: boolean;
	//   scores: { digit: number; score: number }[];
	//   result: number;
	//   templateImages?: Map<number, string>;
	// }

	let fileInput = $state<HTMLInputElement>()
	let result = $state<number[][]>([
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	])
	let processing = $state(false)
	// let debugData = $state<DebugInfo[]>([]);
	// let showDebug = $state(false);
	// let selectedDebug = $state<DebugInfo | null>(null);
	let templates: Map<number, ImageData[]> = new Map()
	// let templateUrls: Map<number, string> = new Map();
	const TEMPLATE_SIZE = 50

	const templateModules = import.meta.glob('$lib/assets/ff14_mini-cactpot/*.png', {
		eager: true,
		import: 'default'
	})

	const payout = {
		6: 10000,
		7: 3600,
		8: 720,
		9: 360,
		10: 80,
		11: 252,
		12: 108,
		13: 72,
		14: 54,
		15: 180,
		16: 72,
		17: 180,
		18: 119,
		19: 36,
		20: 306,
		21: 1080,
		22: 144,
		23: 1800,
		24: 3600
	}

	onMount(() => {
		loadTemplates()
		window.addEventListener('paste', handlePaste)
		return () => window.removeEventListener('paste', handlePaste)
	})

	async function loadTemplates() {
		for (const [path, module] of Object.entries(templateModules)) {
			const match = path.match(/\/(\d)(?:-\d+)?\.png$/)
			if (match) {
				const digit = parseInt(match[1])
				const img = await loadImage(module as string)
				const canvas = document.createElement('canvas')
				const ctx = canvas.getContext('2d')!
				canvas.width = img.width
				canvas.height = img.height
				ctx.drawImage(img, 0, 0)

				const processedCanvas = preprocessForOCR(canvas, -1, digit)

				const resizedCanvas = document.createElement('canvas')
				const resizedCtx = resizedCanvas.getContext('2d')!
				resizedCanvas.width = TEMPLATE_SIZE
				resizedCanvas.height = TEMPLATE_SIZE
				resizedCtx.drawImage(processedCanvas, 0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE)

				const processedImageData = resizedCtx.getImageData(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE)

				if (!templates.has(digit)) {
					templates.set(digit, [])
				}
				templates.get(digit)!.push(processedImageData)

				// if (!templateUrls.has(digit)) {
				//   templateUrls.set(digit, imageDataToDataURL(processedImageData));
				// }
			}
		}
	}

	async function handlePaste(e: ClipboardEvent): Promise<void> {
		e.preventDefault()
		const items = e.clipboardData?.items
		if (!items) return

		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf('image') !== -1) {
				const file = items[i].getAsFile()
				if (file) await processImage(file)
				break
			}
		}
	}

	async function processImage(file: File): Promise<void> {
		processing = true
		// debugData = [];

		try {
			const img = await loadImage(URL.createObjectURL(file))
			const circles = detectCircles(img)
			const grid = sortCirclesToGrid(circles)
			const newResult = await recognizeGrid(img, grid)
			result = newResult
		} catch (error) {
			console.log(error)
		}

		processing = false
	}

	function detectCircles(img: HTMLImageElement): Circle[] {
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')!
		canvas.width = img.width
		canvas.height = img.height
		ctx.drawImage(img, 0, 0)

		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		const gray = toGrayscale(imageData)

		for (const threshold of [80, 100, 120, 140, 160]) {
			const binary = binarize(gray, threshold)
			const regions = findConnectedRegions(binary, canvas.width, canvas.height)

			const circles = regions
				.filter((r) => {
					const area = r.pixels.length
					const circularity = calculateCircularity(r)
					return area > 200 && area < 10000 && circularity > 0.5
				})
				.map((r) => ({
					x: r.centerX,
					y: r.centerY,
					radius: r.radius
				}))

			if (circles.length === 9) return circles
		}

		throw new Error('未檢測到 9 個圓形')
	}

	function toGrayscale(imageData: ImageData): Uint8Array {
		const data = imageData.data
		const gray = new Uint8Array(data.length / 4)
		for (let i = 0; i < data.length; i += 4) {
			gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
		}
		return gray
	}

	function preprocessForOCR(
		canvas: HTMLCanvasElement,
		row: number,
		col: number
	): HTMLCanvasElement {
		const ctx = canvas.getContext('2d')!
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		const data = imageData.data

		const targetR = 100,
			targetG = 36,
			targetB = 36
		const tolerance = 70

		for (let i = 0; i < data.length; i += 4) {
			const r = data[i]
			const g = data[i + 1]
			const b = data[i + 2]

			const distance = Math.sqrt(
				Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2)
			)

			if (distance <= tolerance) {
				data[i] = 255
				data[i + 1] = 255
				data[i + 2] = 255
			} else {
				data[i] = 0
				data[i + 1] = 0
				data[i + 2] = 0
			}
		}

		ctx.putImageData(imageData, 0, 0)

		const width = canvas.width
		const height = canvas.height

		const maskedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		const maskedData = maskedImageData.data

		const centerX = width / 2
		const centerY = height / 2
		const radius = (Math.min(width, height) / 2) * 0.77
		const radiusSquared = radius * radius

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = (y * width + x) * 4

				const dx = x - centerX
				const dy = y - centerY
				const distanceSquared = dx * dx + dy * dy

				if (distanceSquared > radiusSquared) {
					maskedData[idx] = 0
					maskedData[idx + 1] = 0
					maskedData[idx + 2] = 0
				}
			}
		}

		ctx.putImageData(maskedImageData, 0, 0)
		return canvas
	}

	function binarize(gray: Uint8Array, threshold: number): Uint8Array {
		const binary = new Uint8Array(gray.length)
		for (let i = 0; i < gray.length; i++) {
			binary[i] = gray[i] > threshold ? 1 : 0
		}
		return binary
	}

	function findConnectedRegions(binary: Uint8Array, width: number, height: number): Region[] {
		const visited = new Uint8Array(binary.length)
		const regions: Region[] = []

		function floodFill(startIdx: number): Region {
			const stack = [startIdx]
			const pixels: number[] = []
			let minX = width,
				maxX = 0,
				minY = height,
				maxY = 0

			while (stack.length > 0) {
				const idx = stack.pop()!
				if (visited[idx] || binary[idx] === 0) continue

				visited[idx] = 1
				pixels.push(idx)

				const x = idx % width
				const y = Math.floor(idx / width)
				minX = Math.min(minX, x)
				maxX = Math.max(maxX, x)
				minY = Math.min(minY, y)
				maxY = Math.max(maxY, y)
				;[
					idx - width - 1,
					idx - width,
					idx - width + 1,
					idx - 1,
					idx + 1,
					idx + width - 1,
					idx + width,
					idx + width + 1
				].forEach((n) => {
					if (n >= 0 && n < binary.length && !visited[n] && binary[n] === 1) {
						stack.push(n)
					}
				})
			}

			return {
				pixels,
				centerX: (minX + maxX) / 2,
				centerY: (minY + maxY) / 2,
				radius: Math.max(maxX - minX, maxY - minY) / 2,
				minX,
				maxX,
				minY,
				maxY
			}
		}

		for (let i = 0; i < binary.length; i++) {
			if (binary[i] === 1 && !visited[i]) {
				regions.push(floodFill(i))
			}
		}

		return regions
	}

	function calculateCircularity(region: Region): number {
		const area = region.pixels.length
		const perimeter = 2 * (region.maxX - region.minX + (region.maxY - region.minY))
		return perimeter === 0 ? 0 : (4 * Math.PI * area) / (perimeter * perimeter)
	}

	function sortCirclesToGrid(circles: Circle[]): Circle[][] {
		if (circles.length !== 9) throw new Error(`找到 ${circles.length} 個圓形，需要 9 個`)

		const sorted = [...circles].sort((a, b) => a.y - b.y)
		return [
			sorted.slice(0, 3).sort((a, b) => a.x - b.x),
			sorted.slice(3, 6).sort((a, b) => a.x - b.x),
			sorted.slice(6, 9).sort((a, b) => a.x - b.x)
		]
	}

	async function recognizeGrid(img: HTMLImageElement, grid: Circle[][]): Promise<number[][]> {
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')!
		canvas.width = img.width
		canvas.height = img.height
		ctx.drawImage(img, 0, 0)

		const result: number[][] = []
		for (let row = 0; row < grid.length; row++) {
			const rowResult: number[] = []
			for (let col = 0; col < grid[row].length; col++) {
				const circle = grid[row][col]
				rowResult.push(recognizeCircle(ctx, circle, row, col))
			}
			result.push(rowResult)
		}
		return result
	}

	function recognizeCircle(
		ctx: CanvasRenderingContext2D,
		circle: Circle,
		row: number,
		col: number
	): number {
		const size = Math.ceil(circle.radius * 2)
		const cropCanvas = document.createElement('canvas')
		const cropCtx = cropCanvas.getContext('2d')!
		cropCanvas.width = size
		cropCanvas.height = size

		cropCtx.fillStyle = 'black'
		cropCtx.fillRect(0, 0, size, size)

		cropCtx.save()
		cropCtx.beginPath()
		cropCtx.arc(size / 2, size / 2, circle.radius, 0, Math.PI * 2)
		cropCtx.clip()

		cropCtx.drawImage(
			ctx.canvas,
			circle.x - size / 2,
			circle.y - size / 2,
			size,
			size,
			0,
			0,
			size,
			size
		)
		cropCtx.restore()

		// const cropped = cropCtx.getImageData(0, 0, size, size);
		// const cropImageUrl = imageDataToDataURL(cropped);

		const processedCanvas = preprocessForOCR(cropCanvas, row, col)
		const processedImageData = processedCanvas
			.getContext('2d')!
			.getImageData(0, 0, processedCanvas.width, processedCanvas.height)
		// const grayImageUrl = imageDataToDataURL(processedImageData);

		const isEmpty = isEmptyCircle(processedImageData)

		if (isEmpty) {
			// debugData.push({
			//   position: { row, col },
			//   cropImage: cropImageUrl,
			//   grayImage: grayImageUrl,
			//   isEmpty: true,
			//   scores: [],
			//   result: 0
			// });
			return 0
		}

		const scores: { digit: number; score: number }[] = []
		let bestMatch = 0
		let bestScore = -1

		for (const [digit, templateList] of templates) {
			let maxScore = -1

			for (const template of templateList) {
				const score = compareWithSSIM(processedImageData, template)
				if (score > maxScore) {
					maxScore = score
				}
			}

			scores.push({ digit, score: maxScore })

			if (maxScore > bestScore) {
				bestScore = maxScore
				bestMatch = digit
			}
		}

		scores.sort((a, b) => b.score - a.score)

		// debugData.push({
		//   position: { row, col },
		//   cropImage: cropImageUrl,
		//   grayImage: grayImageUrl,
		//   isEmpty: false,
		//   scores,
		//   result: bestMatch,
		//   templateImages: templateUrls
		// });

		return bestMatch
	}

	// function imageDataToDataURL(imageData: ImageData): string {
	//   const canvas = document.createElement('canvas');
	//   const ctx = canvas.getContext('2d')!;
	//   canvas.width = imageData.width;
	//   canvas.height = imageData.height;
	//   ctx.putImageData(imageData, 0, 0);
	//   return canvas.toDataURL();
	// }

	function isEmptyCircle(imageData: ImageData): boolean {
		const data = imageData.data
		let whitePixels = 0

		for (let i = 0; i < data.length; i += 4) {
			if (data[i] > 127) {
				whitePixels++
			}
		}

		const totalPixels = data.length / 4
		return whitePixels / totalPixels < 0.02
	}

	function compareWithSSIM(img1: ImageData, img2: ImageData): number {
		const resized1 = resizeImageData(img1, TEMPLATE_SIZE, TEMPLATE_SIZE)
		const resized2 = resizeImageData(img2, TEMPLATE_SIZE, TEMPLATE_SIZE)

		const { mssim } = ssim(resized1, resized2)

		return mssim
	}

	function resizeImageData(
		imageData: ImageData,
		targetWidth: number,
		targetHeight: number
	): ImageData {
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')!
		canvas.width = imageData.width
		canvas.height = imageData.height
		ctx.putImageData(imageData, 0, 0)

		const resized = document.createElement('canvas')
		const resizedCtx = resized.getContext('2d')!
		resized.width = targetWidth
		resized.height = targetHeight

		resizedCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight)

		return resizedCtx.getImageData(0, 0, targetWidth, targetHeight)
	}

	function loadImage(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image()
			img.onload = () => resolve(img)
			img.onerror = reject
			img.src = src
		})
	}

	function handleFileChange(e: Event): void {
		const file = (e.target as HTMLInputElement).files?.[0]
		if (file) processImage(file)
	}

	function updateCell(row: number, col: number, value: string): void {
		const num = parseInt(value)
		result[row][col] = num >= 1 && num <= 9 ? num : 0
	}

	function calculateLineScore(nums: number[]): number {
		if (nums.some((n) => n === 0)) return 0
		const sum = nums.reduce((a, b) => a + b, 0)
		return payout[sum as keyof typeof payout] || 0
	}

	function calculateExpectedScore(nums: number[]): number {
		const knownNums = nums.filter((n) => n !== 0)
		if (knownNums.length === 3) {
			return calculateLineScore(nums)
		}

		const allNums = result.flat().filter((n) => n !== 0)
		const usedNums = new Set(allNums)
		const availableNums = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !usedNums.has(n))

		if (availableNums.length === 0 || usedNums.size === 0) return 0

		let totalScore = 0
		let count = 0

		const missingCount = 3 - knownNums.length
		if (missingCount === 1) {
			for (const num of availableNums) {
				const testNums = [...nums]
				for (let i = 0; i < testNums.length; i++) {
					if (testNums[i] === 0) {
						testNums[i] = num
						break
					}
				}
				totalScore += calculateLineScore(testNums)
				count++
			}
		} else if (missingCount === 2) {
			for (let i = 0; i < availableNums.length; i++) {
				for (let j = 0; j < availableNums.length; j++) {
					if (i === j) continue
					const testNums = [...nums]
					let filled = 0
					for (let k = 0; k < testNums.length; k++) {
						if (testNums[k] === 0) {
							testNums[k] = filled === 0 ? availableNums[i] : availableNums[j]
							filled++
						}
					}
					totalScore += calculateLineScore(testNums)
					count++
				}
			}
		} else if (missingCount === 3) {
			for (let i = 0; i < availableNums.length; i++) {
				for (let j = 0; j < availableNums.length; j++) {
					if (i === j) continue
					for (let k = 0; k < availableNums.length; k++) {
						if (k === i || k === j) continue
						const sum = availableNums[i] + availableNums[j] + availableNums[k]
						totalScore += payout[sum as keyof typeof payout] || 0
						count++
					}
				}
			}
		}

		return count > 0 ? Math.round(totalScore / count) : 0
	}

	function getBestLines(): { type: string; index: number; score: number; expected: number }[] {
		const lines: { type: string; index: number; score: number; expected: number }[] = []

		// 橫向三條線
		for (let i = 0; i < 3; i++) {
			lines.push({
				type: 'row',
				index: i,
				score: calculateLineScore(result[i]),
				expected: calculateExpectedScore(result[i])
			})
		}

		// 縱向三條線
		for (let i = 0; i < 3; i++) {
			const nums = [result[0][i], result[1][i], result[2][i]]
			lines.push({
				type: 'col',
				index: i,
				score: calculateLineScore(nums),
				expected: calculateExpectedScore(nums)
			})
		}

		// 對角線 \ (左上到右下)
		lines.push({
			type: 'diag1',
			index: 0,
			score: calculateLineScore([result[0][0], result[1][1], result[2][2]]),
			expected: calculateExpectedScore([result[0][0], result[1][1], result[2][2]])
		})

		// 對角線 / (右上到左下)
		lines.push({
			type: 'diag2',
			index: 1,
			score: calculateLineScore([result[0][2], result[1][1], result[2][0]]),
			expected: calculateExpectedScore([result[0][2], result[1][1], result[2][0]])
		})

		// 按照實際分數或期望值排序(取較大者)
		return lines.sort((a, b) => Math.max(b.score, b.expected) - Math.max(a.score, a.expected))
	}

	$effect(() => {
		result
	})
</script>

<div class="container mx-auto px-4 py-8 max-w-7xl">
	<h2 class="text-3xl font-bold mb-6 text-gray-800">FF14 Mini Cactpot</h2>

	<div class="border-2 rounded-lg p-6 mb-6">
		<ul class="space-y-2 text-gray-600">
			<li class="flex items-center gap-2">
				<span class="w-2 h-2 bg-blue-500 rounded-full"></span>
				<code>Win+Shift+S</code>
				<span>截圖貼上圖片</span>
			</li>
			<li class="flex items-center gap-2">
				<span class="w-2 h-2 bg-blue-500 rounded-full"></span>
				<span>或點擊下方按鈕上傳檔案</span>
			</li>
		</ul>
	</div>

	<input
		type="file"
		accept="image/*"
		bind:this={fileInput}
		onchange={handleFileChange}
		class="block w-full text-sm text-gray-500
      file:mr-4 file:py-2 file:px-4
      file:rounded-lg file:border-0
      file:text-sm file:font-semibold
      file:bg-blue-50 file:text-blue-700
      hover:file:bg-blue-100
      cursor-pointer mb-6"
	/>

	{#if processing}
		<div class="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mb-6">
			<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
			<p class="text-blue-700 font-medium">辨識中...</p>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 mb-6">
		<div class="bg-white p-6">
			<h3 class="text-xl font-semibold mb-4 text-gray-700">辨識結果</h3>

			{#snippet gridContent()}
				{@const bestLines = getBestLines()}
				{@const bestLine = bestLines[0]}
				{@const maxValue = bestLine?.score > 0 ? bestLine.score : bestLine?.expected || 0}
				<div class="grid grid-cols-5 gap-1 w-fit">
					{#each [1] as _}
						{@const line = bestLines.find((l) => l.type === 'diag1')}
						{@const diag1Score = line?.score || 0}
						{@const diag1Expected = line?.expected || 0}
						{@const diag1Value = diag1Score > 0 ? diag1Score : diag1Expected}
						{@const isDiag1Max = diag1Value > 0 && diag1Value === maxValue}
						<div
							class="w-16 h-16 flex flex-col items-center justify-center text-xs {isDiag1Max
								? 'bg-yellow-100 border-2 border-yellow-500 font-bold'
								: 'bg-gray-50'} border border-gray-300 rounded"
						>
							<Icon icon="mdi:arrow-bottom-right" class="w-4 h-4 text-gray-600" />
							{#if diag1Score > 0}
								<div
									class="{isDiag1Max ? 'text-yellow-700 font-bold' : 'text-blue-600'} text-[11px]"
								>
									{diag1Score}
								</div>
							{:else if diag1Expected > 0}
								<div class="{isDiag1Max ? 'text-yellow-600' : 'text-gray-500'} text-[10px]">
									{diag1Expected}
								</div>
							{:else}
								<div class="text-gray-400 text-xs">-</div>
							{/if}
						</div>
					{/each}
					{#each [0, 1, 2] as col}
						{@const line = bestLines.find((l) => l.type === 'col' && l.index === col)}
						{@const colScore = line?.score || 0}
						{@const colExpected = line?.expected || 0}
						{@const colValue = colScore > 0 ? colScore : colExpected}
						{@const isMax = colValue > 0 && colValue === maxValue}
						<div
							class="w-16 h-16 flex flex-col items-center justify-center text-xs {isMax
								? 'bg-yellow-100 border-2 border-yellow-500 font-bold'
								: 'bg-gray-50'} border border-gray-300 rounded"
						>
							<Icon icon="mdi:arrow-down" class="w-4 h-4 text-gray-600" />
							{#if colScore > 0}
								<div class="{isMax ? 'text-yellow-700 font-bold' : 'text-blue-600'} text-[11px]">
									{colScore}
								</div>
							{:else if colExpected > 0}
								<div class="{isMax ? 'text-yellow-600' : 'text-gray-500'} text-[10px]">
									{colExpected}
								</div>
							{:else}
								<div class="text-gray-400 text-xs">-</div>
							{/if}
						</div>
					{/each}
					{#each [1] as _}
						{@const line = bestLines.find((l) => l.type === 'diag2')}
						{@const diag2Score = line?.score || 0}
						{@const diag2Expected = line?.expected || 0}
						{@const diag2Value = diag2Score > 0 ? diag2Score : diag2Expected}
						{@const isDiag2Max = diag2Value > 0 && diag2Value === maxValue}
						<div
							class="w-16 h-16 flex flex-col items-center justify-center text-xs {isDiag2Max
								? 'bg-yellow-100 border-2 border-yellow-500 font-bold'
								: 'bg-gray-50'} border border-gray-300 rounded"
						>
							<Icon icon="mdi:arrow-bottom-left" class="w-4 h-4 text-gray-600" />
							{#if diag2Score > 0}
								<div
									class="{isDiag2Max ? 'text-yellow-700 font-bold' : 'text-blue-600'} text-[11px]"
								>
									{diag2Score}
								</div>
							{:else if diag2Expected > 0}
								<div class="{isDiag2Max ? 'text-yellow-600' : 'text-gray-500'} text-[10px]">
									{diag2Expected}
								</div>
							{:else}
								<div class="text-gray-400 text-xs">-</div>
							{/if}
						</div>
					{/each}
					{#each [0, 1, 2] as rowIndex}
						{@const line = bestLines.find((l) => l.type === 'row' && l.index === rowIndex)}
						{@const rowScore = line?.score || 0}
						{@const rowExpected = line?.expected || 0}
						{@const rowValue = rowScore > 0 ? rowScore : rowExpected}
						{@const isMax = rowValue > 0 && rowValue === maxValue}
						<div
							class="w-16 h-16 flex flex-col items-center justify-center text-xs {isMax
								? 'bg-yellow-100 border-2 border-yellow-500 font-bold'
								: 'bg-gray-50'} border border-gray-300 rounded"
						>
							<Icon icon="mdi:arrow-right" class="w-4 h-4 text-gray-600" />
							{#if rowScore > 0}
								<div class="{isMax ? 'text-yellow-700 font-bold' : 'text-blue-600'} text-[11px]">
									{rowScore}
								</div>
							{:else if rowExpected > 0}
								<div class="{isMax ? 'text-yellow-600' : 'text-gray-500'} text-[10px]">
									{rowExpected}
								</div>
							{:else}
								<div class="text-gray-400 text-xs">-</div>
							{/if}
						</div>
						{#each result[rowIndex] as cell, colIndex}
							<input
								type="text"
								inputmode="numeric"
								maxlength="1"
								value={cell === 0 ? '' : cell}
								oninput={(e) => updateCell(rowIndex, colIndex, e.currentTarget.value)}
								class="w-16 h-16 border-2 border-gray-400 text-center text-2xl font-bold {cell === 0
									? 'bg-gray-100 text-gray-400'
									: 'bg-white text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 rounded"
								placeholder="-"
								onkeypress={(e) => {
									if (!/[0-9]/.test(e.key)) {
										e.preventDefault()
									}
								}}
							/>
						{/each}
						<div class="w-16 h-16"></div>
					{/each}
				</div>
			{/snippet}
			{@render gridContent()}
		</div>
	</div>
</div>
