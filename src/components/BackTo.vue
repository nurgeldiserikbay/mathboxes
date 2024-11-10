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
	right: 53%;
	z-index: 20;
	animation: show 1s 0.5s linear forwards;
	opacity: 0;
}

@keyframes show {
	0% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}
</style>
