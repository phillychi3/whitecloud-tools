<script lang="ts">
	import Icon from '@iconify/svelte'
	import FF14Image from '$lib/assets/finalfantasyxiv.svelte'
</script>

<nav class="border-b border-gray-200 bg-white shadow-sm">
	<div class="px-10">
		<div class="flex h-16 items-center justify-between">
			<div class="flex items-center gap-2">
				<FF14Image class="w-8 h-8" />
				<a href="/ff14" class="text-lg font-semibold text-gray-800">Final Fantasy XIV 工具</a>
			</div>
			<div class="flex left-0 items-center justify-center gap-4 text-center">
				<a href="/" class="text-gray-600 hover:text-gray-800 flex items-center gap-1">
					<Icon icon="mdi:home" class="w-5 h-5" /><span>首頁</span>
				</a>
			</div>
		</div>
	</div>
</nav>
