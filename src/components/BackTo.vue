<template>
	<button v-if="pageStore.backLink" class="btn back-to" @click="click">
		Back
	</button>
</template>

<script lang="ts" setup>
import { usePageStore } from '@/store/pageStore'

const pageStore = usePageStore()

function click() {
	pageStore.toBackLink()
}
</script>

<style lang="scss" scoped>
@import '@/assets/_common.scss';

.back-to {
	position: absolute;
	bottom: 7px;
	right: 10px;
	z-index: 20;
}
</style>
