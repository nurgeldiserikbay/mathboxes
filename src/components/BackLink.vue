<script lang="ts" setup>
import { usePageStore } from '@/store/pageStore'

import IconLeft from '@/assets/img/left.svg'
import { useAudio } from '@/composables/useAudio'

const { playAudio } = useAudio()
const pageStore = usePageStore()

function back() {
	playAudio('click', true)
	pageStore.toBackLink()
}
</script>

<template>
	<button class="back-link" @click="back">
		<IconLeft />
	</button>
</template>

<style lang="scss" scoped>
.back-link {
	position: absolute;
	top: 10px;
	background: transparent;
	padding: 0;
	border: none;
	outline: none;
	cursor: pointer;

	svg {
		width: 45px;
		height: 45px;
	}
}
</style>
