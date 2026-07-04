<script lang="ts">
	import * as Card from '$lib/components/ui/card'
	import { Button } from '$lib/components/ui/button'
	import Icon from '@iconify/svelte'
	import Navbar from '$lib/components/Navbar.svelte'
	import toast from 'svelte-french-toast'

	type Algorithm = 'HS256' | 'HS384' | 'HS512' | 'none'
	type ViewMode = 'decode' | 'encode' | 'ctf'

	type DecodedJwt = {
		header: Record<string, unknown>
		payload: Record<string, unknown>
		headerText: string
		payloadText: string
		signature: string
		signingInput: string
		segments: string[]
	}

	type ClaimInfo = {
		key: string
		value: string
		meta: string
	}

	const sampleHeader = {
		alg: 'HS256',
		typ: 'JWT'
	}

	const samplePayload = {
		sub: 'ctf-user',
		name: 'whitecloud',
		admin: false,
		iat: Math.floor(Date.now() / 1000)
	}

	const weakSecrets = [
		'secret',
		'password',
		'123456',
		'admin',
		'jwt',
		'token',
		'key',
		'qwerty',
		'letmein',
		'changeit',
		'ctf',
		'flag',
		'HS256',
		'private',
		'public'
	].join('\n')

	const algorithms: Algorithm[] = ['HS256', 'HS384', 'HS512', 'none']
	const hmacAlgorithms: Algorithm[] = ['HS256', 'HS384', 'HS512']

	let activeMode = $state<ViewMode>('decode')
	let jwtInput = $state('')
	let decodedToken = $state<DecodedJwt | null>(null)
	let decodeError = $state('')

	let builderHeader = $state(JSON.stringify(sampleHeader, null, 2))
	let builderPayload = $state(JSON.stringify(samplePayload, null, 2))
	let builderSecret = $state('secret')
	let builderAlg = $state<Algorithm>('HS256')
	let builtToken = $state('')

	let verifySecret = $state('secret')
	let verifyStatus = $state('')
	let verifyTone = $state<'idle' | 'success' | 'error' | 'warning'>('idle')

	let ctfWordlist = $state(weakSecrets)
	let bruteStatus = $state('')
	let foundSecret = $state('')
	let noneToken = $state('')

	let base64Input = $state('')
	let base64Output = $state('')
	let base64Mode = $state<'encode' | 'decode'>('decode')
	let copyState = $state('')

	const claimInfos = $derived.by(() => {
		if (!decodedToken) return []
		return summarizeClaims(decodedToken.payload)
	})

	const tokenAlgorithm = $derived.by(() => {
		if (!decodedToken) return ''
		return String(decodedToken.header.alg ?? 'unknown')
	})

	function bytesToBase64Url(bytes: Uint8Array): string {
		let binary = ''
		const chunkSize = 0x8000
		for (let i = 0; i < bytes.length; i += chunkSize) {
			const chunk = bytes.subarray(i, i + chunkSize)
			binary += String.fromCharCode(...chunk)
		}

		return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
	}

	function base64UrlToBytes(input: string): Uint8Array {
		const normalized = input.trim().replace(/-/g, '+').replace(/_/g, '/')
		const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
		const binary = atob(padded)
		const bytes = new Uint8Array(binary.length)

		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i)
		}

		return bytes
	}

	function textToBase64Url(text: string): string {
		return bytesToBase64Url(new TextEncoder().encode(text))
	}

	function base64UrlToText(input: string): string {
		return new TextDecoder().decode(base64UrlToBytes(input))
	}

	function prettyJson(value: unknown): string {
		return JSON.stringify(value, null, 2)
	}

	function parseJwt(token: string): DecodedJwt {
		const segments = token.trim().split('.')
		if (segments.length !== 3) {
			throw new Error('JWT 應該包含 header.payload.signature 三段')
		}

		const headerText = base64UrlToText(segments[0])
		const payloadText = base64UrlToText(segments[1])
		const header = JSON.parse(headerText) as Record<string, unknown>
		const payload = JSON.parse(payloadText) as Record<string, unknown>

		return {
			header,
			payload,
			headerText: prettyJson(header),
			payloadText: prettyJson(payload),
			signature: segments[2],
			signingInput: `${segments[0]}.${segments[1]}`,
			segments
		}
	}

	function getHashName(alg: Algorithm): string {
		switch (alg) {
			case 'HS256':
				return 'SHA-256'
			case 'HS384':
				return 'SHA-384'
			case 'HS512':
				return 'SHA-512'
			default:
				return ''
		}
	}

	async function signHmac(input: string, secret: string, alg: Algorithm): Promise<string> {
		const hash = getHashName(alg)
		if (!hash) return ''

		const key = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(secret),
			{ name: 'HMAC', hash },
			false,
			['sign']
		)
		const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))
		return bytesToBase64Url(new Uint8Array(signature))
	}

	async function buildJwt() {
		try {
			const header = JSON.parse(builderHeader) as Record<string, unknown>
			const payload = JSON.parse(builderPayload) as Record<string, unknown>
			header.alg = builderAlg
			header.typ = header.typ ?? 'JWT'

			const encodedHeader = textToBase64Url(JSON.stringify(header))
			const encodedPayload = textToBase64Url(JSON.stringify(payload))
			const signingInput = `${encodedHeader}.${encodedPayload}`
			const signature =
				builderAlg === 'none' ? '' : await signHmac(signingInput, builderSecret, builderAlg)

			builtToken = `${signingInput}.${signature}`
			toast.success('JWT 已產生')
		} catch (err) {
			toast.error(`無法產生 JWT: ${(err as Error).message}`)
		}
	}

	function selectBuilderAlg(alg: Algorithm) {
		builderAlg = alg

		try {
			const header = JSON.parse(builderHeader || '{}') as Record<string, unknown>
			header.alg = alg
			builderHeader = prettyJson(header)
		} catch (err) {
			const algPattern = /"alg"\s*:\s*"[^"]*"/
			if (algPattern.test(builderHeader)) {
				builderHeader = builderHeader.replace(algPattern, `"alg": "${alg}"`)
				return
			}

			toast.error(`Header JSON 無法同步 alg: ${(err as Error).message}`)
		}
	}

	async function verifyJwt(secret = verifySecret, silent = false): Promise<boolean> {
		if (!decodedToken) {
			if (!silent) toast.error('請先貼上 JWT')
			return false
		}

		const alg = String(decodedToken.header.alg ?? 'none') as Algorithm
		if (alg === 'none') {
			const isUnsigned = decodedToken.signature === ''
			verifyTone = isUnsigned ? 'warning' : 'error'
			verifyStatus = isUnsigned
				? '此 token 使用 alg=none，沒有可驗證的 HMAC 簽章'
				: 'header 宣告 alg=none，但 signature 不為空'
			return isUnsigned
		}

		if (!hmacAlgorithms.includes(alg)) {
			verifyTone = 'error'
			verifyStatus = `目前只支援 HMAC JWT: ${alg}`
			return false
		}

		try {
			const expected = await signHmac(decodedToken.signingInput, secret, alg)
			const matched = expected === decodedToken.signature
			verifyTone = matched ? 'success' : 'error'
			verifyStatus = matched ? `簽章正確` : '簽章不符合'
			return matched
		} catch (err) {
			verifyTone = 'error'
			verifyStatus = `驗證失敗: ${(err as Error).message}`
			return false
		}
	}

	function loadDecodedToBuilder() {
		if (!decodedToken) return
		builderHeader = decodedToken.headerText
		builderPayload = decodedToken.payloadText
		builderAlg = algorithms.includes(tokenAlgorithm as Algorithm)
			? (tokenAlgorithm as Algorithm)
			: 'HS256'
		activeMode = 'encode'
	}

	function addAdminClaim() {
		try {
			const payload = JSON.parse(builderPayload) as Record<string, unknown>
			payload.admin = true
			builderPayload = prettyJson(payload)
			toast.success('已加入 admin: true')
		} catch (err) {
			toast.error(`Payload JSON 無效: ${(err as Error).message}`)
		}
	}

	function addKidHeader() {
		try {
			const header = JSON.parse(builderHeader) as Record<string, unknown>
			header.kid = '../../../../../dev/null'
			builderHeader = prettyJson(header)
			toast.success('已加入 CTF 常見 kid 測試值')
		} catch (err) {
			toast.error(`Header JSON 無效: ${(err as Error).message}`)
		}
	}

	function makeNoneToken() {
		if (!decodedToken) {
			toast.error('請先貼上 JWT')
			return
		}

		const header = { ...decodedToken.header, alg: 'none' }
		const encodedHeader = textToBase64Url(JSON.stringify(header))
		const encodedPayload = textToBase64Url(JSON.stringify(decodedToken.payload))
		noneToken = `${encodedHeader}.${encodedPayload}.`
		toast.success('已產生 alg=none 變體')
	}

	async function bruteForceSecret() {
		if (!decodedToken) {
			toast.error('請先貼上 JWT')
			return
		}

		const alg = String(decodedToken.header.alg ?? '')
		if (!['HS256', 'HS384', 'HS512'].includes(alg)) {
			bruteStatus = `目前只支援 HS256/HS384/HS512，這顆是 ${alg || 'unknown'}`
			foundSecret = ''
			return
		}

		const words = ctfWordlist
			.split(/\r?\n/)
			.map((word) => word.trim())
			.filter(Boolean)

		foundSecret = ''
		bruteStatus = `測試 ${words.length} 個候選 secret...`

		for (const word of words) {
			const expected = await signHmac(decodedToken.signingInput, word, alg as Algorithm)
			if (expected === decodedToken.signature) {
				foundSecret = word
				bruteStatus = `found secret: ${word}`
				verifySecret = word
				await verifyJwt(word, true)
				return
			}
		}

		bruteStatus = '沒有在字典中找到符合的 secret'
	}

	async function copyToClipboard(text: string, label: string) {
		if (!text) return

		try {
			await navigator.clipboard.writeText(text)
			copyState = label
			setTimeout(() => {
				if (copyState === label) copyState = ''
			}, 1600)
			toast.success('已複製')
		} catch (err) {
			toast.error(`複製失敗: ${(err as Error).message}`)
		}
	}

	function clearAll() {
		jwtInput = ''
		decodedToken = null
		decodeError = ''
		verifyStatus = ''
		verifyTone = 'idle'
		bruteStatus = ''
		foundSecret = ''
		noneToken = ''
	}

	function summarizeClaims(payload: Record<string, unknown>): ClaimInfo[] {
		return ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'].flatMap((key) => {
			if (!(key in payload)) return []
			const value = payload[key]
			const isTimeClaim = ['exp', 'nbf', 'iat'].includes(key) && typeof value === 'number'

			return {
				key,
				value: String(value),
				meta: isTimeClaim ? formatUnixTime(value) : ''
			}
		})
	}

	function formatUnixTime(value: number): string {
		const date = new Date(value * 1000)
		if (Number.isNaN(date.getTime())) return ''
		return date.toLocaleString('zh-TW', { hour12: false })
	}

	$effect(() => {
		if (!jwtInput.trim()) {
			decodedToken = null
			decodeError = ''
			return
		}

		try {
			decodedToken = parseJwt(jwtInput)
			decodeError = ''
			verifyStatus = ''
			verifyTone = 'idle'
		} catch (err) {
			decodedToken = null
			decodeError = (err as Error).message
		}
	})
</script>

<Navbar />

<div class="container mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div>
			<p class="mb-2 text-sm font-medium text-gray-500">Security Tools</p>
			<h1 class="text-3xl font-bold text-gray-800">JWT Tool</h1>
		</div>

		<div class="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
			{#each [{ value: 'decode', label: '解碼', icon: 'mdi:code-json' }, { value: 'encode', label: '編碼', icon: 'mdi:key-plus' }, { value: 'ctf', label: 'CTF', icon: 'mdi:flag-outline' }] as mode}
				<Button
					variant={activeMode === mode.value ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (activeMode = mode.value as ViewMode)}
					class="min-w-20"
				>
					<Icon icon={mode.icon} class="h-4 w-4" />
					{mode.label}
				</Button>
			{/each}
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2 lg:items-start">
		<div class="lg:sticky lg:top-6">
			<Card.Root>
				<Card.Header>
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<Card.Title>Token Input</Card.Title>
						</div>
						<div class="flex gap-2">
							<Button variant="outline" onclick={clearAll} disabled={!jwtInput}>
								<Icon icon="mdi:delete" class="h-4 w-4" />
								清空
							</Button>
							<Button
								variant="secondary"
								onclick={() => copyToClipboard(jwtInput, 'jwtInput')}
								disabled={!jwtInput}
							>
								<Icon
									icon={copyState === 'jwtInput' ? 'mdi:check' : 'mdi:content-copy'}
									class="h-4 w-4"
								/>
								複製
							</Button>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<textarea
						bind:value={jwtInput}
						class="min-h-40 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm break-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
						placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
						spellcheck="false"
					></textarea>

					<Button
						variant="outline"
						onclick={loadDecodedToBuilder}
						disabled={!decodedToken}
						class="mt-3 w-full"
					>
						<Icon icon="mdi:pencil" class="h-4 w-4" />
						載入到編碼器
					</Button>

					{#if decodeError}
						<div
							class="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
						>
							{decodeError}
						</div>
					{:else if decodedToken}
						<div class="mt-3 grid gap-3 sm:grid-cols-3">
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
								<div class="text-xs font-medium text-gray-500">Algorithm</div>
								<div class="mt-1 font-mono text-sm text-gray-800">{tokenAlgorithm}</div>
							</div>
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
								<div class="text-xs font-medium text-gray-500">Segments</div>
								<div class="mt-1 font-mono text-sm text-gray-800">
									{decodedToken.segments.length}
								</div>
							</div>
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
								<div class="text-xs font-medium text-gray-500">Signature</div>
								<div class="mt-1 font-mono text-sm text-gray-800">
									{decodedToken.signature ? `${decodedToken.signature.length} chars` : 'empty'}
								</div>
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<div class="min-w-0">
			{#if activeMode === 'decode'}
				<div class="grid gap-6">
					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between gap-3">
								<div>
									<Card.Title>Header</Card.Title>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => copyToClipboard(decodedToken?.headerText ?? '', 'header')}
									disabled={!decodedToken}
								>
									<Icon icon={copyState === 'header' ? 'mdi:check' : 'mdi:content-copy'} />
								</Button>
							</div>
						</Card.Header>
						<Card.Content>
							<textarea
								value={decodedToken?.headerText ?? ''}
								readonly
								class="min-h-30 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
								placeholder="Header JSON"
							></textarea>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between gap-3">
								<div>
									<Card.Title>Payload</Card.Title>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => copyToClipboard(decodedToken?.payloadText ?? '', 'payload')}
									disabled={!decodedToken}
								>
									<Icon icon={copyState === 'payload' ? 'mdi:check' : 'mdi:content-copy'} />
								</Button>
							</div>
						</Card.Header>
						<Card.Content>
							<textarea
								value={decodedToken?.payloadText ?? ''}
								readonly
								class="min-h-40 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
								placeholder="Payload JSON"
							></textarea>
						</Card.Content>
					</Card.Root>
				</div>

				<div class="mt-6 grid gap-6">
					<Card.Root>
						<Card.Header>
							<Card.Title>Claim Inspector</Card.Title>
						</Card.Header>
						<Card.Content>
							{#if claimInfos.length}
								<div class="space-y-2">
									{#each claimInfos as claim}
										<div
											class="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-[80px_1fr]"
										>
											<div class="font-mono text-sm font-semibold text-gray-700">{claim.key}</div>
											<div class="min-w-0">
												<div class="break-all font-mono text-sm text-gray-800">{claim.value}</div>
												{#if claim.meta}
													<div class="mt-1 text-xs text-gray-500">{claim.meta}</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div
									class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500"
								>
									尚未偵測到 iss、sub、aud、exp、nbf、iat 或 jti。
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<Card.Title>Signature Verify</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								<div>
									<label for="verify-secret" class="mb-2 block text-sm font-medium text-gray-700"
										>Secret</label
									>
									<input
										id="verify-secret"
										bind:value={verifySecret}
										type="text"
										class="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
										placeholder="secret"
									/>
								</div>
								<Button onclick={() => verifyJwt()} disabled={!decodedToken} class="w-full">
									<Icon icon="mdi:shield-check" class="h-4 w-4" />
									驗證簽章
								</Button>
								{#if verifyStatus}
									<div
										class="rounded-lg border px-4 py-3 text-sm"
										class:border-green-200={verifyTone === 'success'}
										class:bg-green-50={verifyTone === 'success'}
										class:text-green-700={verifyTone === 'success'}
										class:border-red-200={verifyTone === 'error'}
										class:bg-red-50={verifyTone === 'error'}
										class:text-red-700={verifyTone === 'error'}
										class:border-amber-200={verifyTone === 'warning'}
										class:bg-amber-50={verifyTone === 'warning'}
										class:text-amber-700={verifyTone === 'warning'}
									>
										{verifyStatus}
									</div>
								{/if}
								{#if false}
									<Button>載入到編碼器</Button>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{:else if activeMode === 'encode'}
				<div class="grid gap-6">
					<Card.Root>
						<Card.Header>
							<Card.Title>JWT Builder</Card.Title>
							<Card.Description>編輯 header、payload，選擇演算法後重新簽出 token。</Card.Description
							>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								<div>
									<div class="mb-2 text-sm font-medium text-gray-700">Algorithm</div>
									<div class="grid grid-cols-2 gap-2 md:grid-cols-4">
										{#each algorithms as alg}
											<Button
												variant={builderAlg === alg ? 'default' : 'outline'}
												onclick={() => selectBuilderAlg(alg)}
											>
												{alg}
											</Button>
										{/each}
									</div>
								</div>

								<div>
									<label for="builder-header" class="mb-2 block text-sm font-medium text-gray-700"
										>Header JSON</label
									>
									<textarea
										id="builder-header"
										bind:value={builderHeader}
										class="min-h-40 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
										spellcheck="false"
									></textarea>
								</div>

								<div>
									<label for="builder-payload" class="mb-2 block text-sm font-medium text-gray-700"
										>Payload JSON</label
									>
									<textarea
										id="builder-payload"
										bind:value={builderPayload}
										class="min-h-48 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
										spellcheck="false"
									></textarea>
								</div>

								{#if builderAlg !== 'none'}
									<div>
										<label for="builder-secret" class="mb-2 block text-sm font-medium text-gray-700"
											>Secret</label
										>
										<input
											id="builder-secret"
											bind:value={builderSecret}
											type="text"
											class="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
											placeholder="secret"
										/>
									</div>
								{/if}

								<div class="grid gap-2 md:grid-cols-3">
									<Button onclick={buildJwt} class="md:col-span-1">
										<Icon icon="mdi:key-plus" class="h-4 w-4" />
										產生
									</Button>
									<Button variant="outline" onclick={addAdminClaim}>
										<Icon icon="mdi:account-key" class="h-4 w-4" />
										admin=true
									</Button>
									<Button variant="outline" onclick={addKidHeader}>
										<Icon icon="mdi:file-key" class="h-4 w-4" />
										kid 測試
									</Button>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between gap-3">
								<div>
									<Card.Title>Generated Token</Card.Title>
									<Card.Description>產生後會同步放回 Token Input 方便解碼檢查。</Card.Description>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => copyToClipboard(builtToken, 'built')}
									disabled={!builtToken}
								>
									<Icon icon={copyState === 'built' ? 'mdi:check' : 'mdi:content-copy'} />
								</Button>
							</div>
						</Card.Header>
						<Card.Content>
							<textarea
								value={builtToken}
								readonly
								class="min-h-96 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm break-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
								placeholder="產生的 JWT 會顯示在這裡"
							></textarea>
						</Card.Content>
					</Card.Root>
				</div>
			{:else}
				<div class="grid gap-6">
					<Card.Root>
						<Card.Header>
							<Card.Title>Weak Secret Brute Force</Card.Title>
							<Card.Description
								>CTF 常見 HS256 弱密鑰字典測試，僅在本機瀏覽器執行。</Card.Description
							>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								<textarea
									bind:value={ctfWordlist}
									class="min-h-64 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
									spellcheck="false"
								></textarea>
								<Button onclick={bruteForceSecret} disabled={!decodedToken} class="w-full">
									<Icon icon="mdi:lock-search" class="h-4 w-4" />
									測試字典
								</Button>
								{#if bruteStatus}
									<div
										class="rounded-lg border px-4 py-3 text-sm"
										class:border-green-200={!!foundSecret}
										class:bg-green-50={!!foundSecret}
										class:text-green-700={!!foundSecret}
										class:border-gray-200={!foundSecret}
										class:bg-gray-50={!foundSecret}
										class:text-gray-700={!foundSecret}
									>
										{bruteStatus}
									</div>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between gap-3">
								<div>
									<Card.Title>alg=none Variant</Card.Title>
									<Card.Description
										>將目前 token 改成未簽章版本，方便 CTF 題目測試。</Card.Description
									>
								</div>
								<Button variant="outline" onclick={makeNoneToken} disabled={!decodedToken}>
									<Icon icon="mdi:creation" class="h-4 w-4" />
									產生
								</Button>
							</div>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								<textarea
									value={noneToken}
									readonly
									class="min-h-40 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm break-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
									placeholder="header.payload."
								></textarea>
								<Button
									variant="secondary"
									onclick={() => copyToClipboard(noneToken, 'none')}
									disabled={!noneToken}
									class="w-full"
								>
									<Icon
										icon={copyState === 'none' ? 'mdi:check' : 'mdi:content-copy'}
										class="h-4 w-4"
									/>
									複製 none token
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{/if}
		</div>
	</div>
</div>
