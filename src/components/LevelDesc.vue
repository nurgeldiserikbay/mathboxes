<script lang="ts" setup>
import { useAudio } from '@/composables/useAudio'
import { I_LEVEL } from '@/utils/types'

withDefaults(
	defineProps<{
		item: I_LEVEL
	}>(),
	{}
)

const { playAudio } = useAudio()
const $emits = defineEmits(['close'])
</script>

<template>
	<div class="desc" @click="playAudio('click', true), $emits('close')">
		<div class="container">
			<div
				:style="{ background: item.bgColor }"
				class="desc__in"
				@click.stop=""
			>
				<div class="desc__head">
					<div class="desc__name">{{ $t(item.name) }}</div>
				</div>
				<div class="desc__data">
					<div class="desc__body" v-html="$t(item.description)" />
				</div>
				<button class="desc__btn" @click="playAudio('click', true), $emits('close')">OK</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.desc {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;

	.container {
		width: 85%;
		max-width: 350px;
	}

	&__in {
		padding: 20px 28px 48px;
		border-radius: 12px;
		height: 80vh;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		margin-bottom: 15px;
	}

	&__head {
		margin-bottom: 15px;
	}

	&__name {
		font-size: 20px;
		font-weight: 900;
		line-height: 1;
		font-style: italic;
		text-transform: capitalize;
		color: #484646;
		letter-spacing: 4px;
	}

	&__data {
		flex-grow: 1;
		overflow: hidden;
		border-radius: 24px;
		width: 100%;
		box-sizing: border-box;
		padding: 22px 18px;
		box-shadow: inset 0 0 15px 0 rgba(0, 0, 0, 0.7);
		margin-bottom: 18px;
		text-align: left;
		line-height: 1.3;
		font-size: 16px;
		font-weight: 600;
		font-style: notmal;
		color: #484646;
		letter-spacing: 2px;
	}

	&__body {
		flex-grow: 1;
	}

	&__btn {
		color: #020202;
		background: transparent;
		padding: 8px 18px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 18px;
		font-weight: 600;
	}
}
</style>

<style lang="scss">
.desc__data {
	.expression {
		display: block;
		text-align: center;
	}
}
</style>
