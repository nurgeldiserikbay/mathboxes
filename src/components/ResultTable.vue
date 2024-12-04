<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { useGameStore } from '@/store/gameStore'
import { useAudio } from '@/composables/useAudio'

withDefaults(
	defineProps<{
		result: number
	}>(),
	{}
)

const $emits = defineEmits(['close'])

const { playAudio } = useAudio()
const gameStore = useGameStore()

const name = ref('')

onMounted(() => {
	name.value = gameStore.name
})
</script>

<template>
	<div class="result">
		<div class="container">
			<div class="result__in" 
			:style="{ background: gameStore.bgColor }">
				<div class="result__title">{{ $t('your_score') }}</div>
				<div class="result__input">
					<input v-model="name" type="text" class="result__input-body" />
				</div>
				<div class="result__table">
					<div>{{ name }}</div>
					<div>{{ result }}</div>
				</div>
				<button class="result__ok" @click="playAudio('click', true), $emits('close', name)">Ok</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.result {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	background: rgb(1, 109, 178);
	background: radial-gradient(
		circle,
		rgba(1, 109, 178, 1) 0%,
		rgba(1, 42, 74, 1) 100%
	);
	box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.4),
		inset 0px -2px 4px rgba(255, 255, 255, 0.2);
	display: flex;
	justify-content: center;
	align-items: center;

	.container {
		width: 93%;
		max-width: 350px;
	}

	&__in {
		padding: 24px 28px 28px;
		border-radius: 12px;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		margin-bottom: 15px;
	}

	&__title {
		font-size: 25px;
		margin-bottom: 25px;
	}

	&__input {
		display: flex;
		align-items: stretch;
		width: 100%;
		height: 65px;
		border-radius: 15px;
		overflow: hidden;
		border: 1px solid #020202;
		box-sizing: border-box;
		margin-bottom: 28px;
	}

	&__input-body {
		width: 93%;
		background: transparent;
		border: none;
		font-size: 26px;
		font-style: italic;
		padding: 5px 10px 5px 18px;
		box-sizing: border-box;
		flex-grow: 1;
		outline: none;
	}

	&__table {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 18px;
		font-size: 22px;
		font-weight: 800;
		box-sizing: border-box;
		margin-bottom: 35px;

		div {
			&:last-child {
				font-size: 24px;
			}
		}
	}

	&__ok {
		color: #020202;
		background: transparent;
		padding: 18px 40px;
		font-size: 24px;
		line-height: 1;
		font-weight: 600;
		border-radius: 20px;
		cursor: pointer;
	}
}
</style>
