<script lang="ts" setup>
import { computed } from 'vue'
import type { Component } from 'vue'

/**
 * Icons are files, not code.
 *
 * Every glyph lives in `src/assets/icons/<name>.svg` and is picked up by the
 * glob below, so swapping one for an artist's export is a file copy — there is
 * no component to edit and no registry to keep in sync. The old version kept
 * thirty inline `v-if` branches in this file, which meant every icon change was
 * a code change and no icon could be handed to a designer.
 *
 * Two families share the API. UI glyphs (pause, play, close…) are drawn with
 * `currentColor` and take their colour from CSS. Game icons (heart, shield,
 * crown…) carry their own palette, because a heart that is not red is not a
 * heart.
 */
const modules = import.meta.glob('../assets/icons/*.svg', {
	eager: true,
	query: '?component',
	import: 'default',
}) as Record<string, Component>

const icons = Object.fromEntries(
	Object.entries(modules).map(([path, component]) => [
		path.slice(path.lastIndexOf('/') + 1, -4),
		component,
	])
) as Record<string, Component>

const $props = withDefaults(
	defineProps<{
		name: string
		size?: number | string
	}>(),
	{ size: 24 }
)

const icon = computed<Component | null>(() => icons[$props.name] ?? null)
</script>

<template>
	<component
		:is="icon"
		v-if="icon"
		class="icon"
		:width="size"
		:height="size"
		aria-hidden="true"
	/>
</template>

<style lang="scss" scoped>
.icon {
	display: block;
	flex-shrink: 0;
}
</style>
