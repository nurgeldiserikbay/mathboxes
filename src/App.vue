<script lang="ts" setup>
import { onMounted } from 'vue'

import Admob from '@/utils/admob'

import HeadMain from '@/components/HeadMain.vue'

import { PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

const pageStore = usePageStore()
const gameStore = useGameStore()

onMounted(() => {
	if (import.meta.env.VITE_APP_MODE !== 'TEST') Admob.initialize()

	gameStore.loadData()
})
</script>

<template>
	<div class="wrapper">
		<HeadMain v-if="pageStore.currentPage === PAGES.START" />
		<component :is="pageStore.currentPageComponent" />
	</div>
</template>

<style lang="scss" scoped>
.wrapper {
	width: 100%;
	min-height: 100dvh;
}
</style>
