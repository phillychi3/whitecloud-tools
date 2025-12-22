<script lang="ts">
	import { PinturaEditor } from '@pqina/svelte-pintura'
	import { getEditorDefaults } from '@pqina/pintura'

	// Import Pintura CSS
	import '@pqina/pintura/pintura.css'

	let {
		src = $bindable(),
		cropData = $bindable()
	}: {
		src?: string
		cropData?: { x: number; y: number; width: number; height: number; imageWidth: number; imageHeight: number } | undefined
	} = $props()

	const editorConfig = {
		...getEditorDefaults(),
		// 只啟用裁切工具
		utils: ['crop']
	}

	function handleProcess(e: any) {
		const imageState = e.detail.imageState
		const dest = e.detail.dest

		console.log('Pintura process event:', { imageState, dest })

		// 獲取裁切資訊
		if (imageState.crop) {
			const crop = imageState.crop
			console.log('Crop data from Pintura:', crop)
			
			cropData = {
				x: crop.x || 0,
				y: crop.y || 0,
				width: crop.width || dest.width,
				height: crop.height || dest.height,
				imageWidth: dest.width,
				imageHeight: dest.height
			}
			
			console.log('Processed cropData:', cropData)
		}
	}
</script>

<div class="editor-wrapper">
	{#if src}
		<PinturaEditor {...editorConfig} {src} on:process={handleProcess} />
	{/if}
</div>

<style>
	.editor-wrapper :global(.pintura-editor) {
		height: 600px;
	}
</style>
