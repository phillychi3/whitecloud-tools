import { GoogleGenAI } from '@google/genai'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData()
	const mainImageBlob = formData.get('mainImage') as Blob
	const maskImageBlob = formData.get('maskImage') as Blob
	const referenceImageBlob = formData.get('referenceImage') as Blob
	const prompt = formData.get('prompt') as string
	const apiKey = formData.get('apiKey') as string

	if (!mainImageBlob || !maskImageBlob || !referenceImageBlob || !prompt) {
		return new Response('Missing required fields', { status: 400 })
	}

	const mainImageBuffer = Buffer.from(await mainImageBlob.arrayBuffer())
	const maskImageBuffer = Buffer.from(await maskImageBlob.arrayBuffer())
	const refImageBuffer = Buffer.from(await referenceImageBlob.arrayBuffer())

	const mainImageBase64 = mainImageBuffer.toString('base64')
	const maskImageBase64 = maskImageBuffer.toString('base64')
	const refImageBase64 = refImageBuffer.toString('base64')

	if (!apiKey) {
		const generatedPrompt = `${prompt}

這是一個圖片編輯任務：
1. 第一張圖片是原始圖片
2. 第二張圖片是遮罩圖（白色區域表示需要編輯的部分）
3. 第三張圖片是參考圖片（顯示想要的風格或內容）

請根據遮罩區域和參考圖片，編輯第一張原始圖片。將遮罩的白色區域替換為類似參考圖片的內容，並保持整體風格和諧。請生成編輯後的完整圖片。`

		return new Response(
			JSON.stringify({
				mainImageBase64,
				maskImageBase64,
				referenceImageBase64: refImageBase64,
				generatedPrompt,
				instructions:
					'您可以複製這些資料到支援的 AI 工具進行手動處理。'
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	}

	try {
		const ai = new GoogleGenAI({ apiKey })

		const mainImageBuffer = Buffer.from(await mainImageBlob.arrayBuffer())
		const maskImageBuffer = Buffer.from(await maskImageBlob.arrayBuffer())
		const refImageBuffer = Buffer.from(await referenceImageBlob.arrayBuffer())

		const mainImageBase64 = mainImageBuffer.toString('base64')
		const maskImageBase64 = maskImageBuffer.toString('base64')
		const refImageBase64 = refImageBuffer.toString('base64')

		const interaction = await ai.interactions.create({
			model: 'gemini-2.5-flash-image',
			input: [
				{
					type: 'text',
					text: `${prompt}

這是一個圖片編輯任務：
1. 第一張圖片是原始圖片
2. 第二張圖片是遮罩圖（白色區域表示需要編輯的部分）
3. 第三張圖片是參考圖片（顯示想要的風格或內容）

請根據遮罩區域和參考圖片，編輯第一張原始圖片。將遮罩的白色區域替換為類似參考圖片的內容，並保持整體風格和諧。請生成編輯後的完整圖片。`
				},
				{ type: 'image', data: mainImageBase64, mime_type: 'image/jpeg' },
				{ type: 'image', data: maskImageBase64, mime_type: 'image/jpeg' },
				{ type: 'image', data: refImageBase64, mime_type: 'image/jpeg' }
			],
			response_modalities: ['image']
		})

		if (interaction.outputs) {
			for (const output of interaction.outputs) {
				if (output.type === 'image' && output.data) {
					const imageBuffer = Buffer.from(output.data, 'base64')
					return new Response(imageBuffer, {
						status: 200,
						headers: { 'Content-Type': output.mime_type || 'image/png' }
					})
				}
			}
		}

		return new Response('No image found in AI response', { status: 500 })
	} catch (error) {
		console.error('AI image generation failed:', error)
		return new Response(`AI image generation failed: ${error}`, { status: 500 })
	}
}
