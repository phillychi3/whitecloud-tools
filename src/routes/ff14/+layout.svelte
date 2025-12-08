<script lang="ts">
	import type { LayoutProps } from './$types'
	import FF14Navbar from '$lib/components/FF14Navbar.svelte'

	let { data, children }: LayoutProps = $props()
</script>

<FF14Navbar />

{@render children()}
