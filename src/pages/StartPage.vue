<script lang="ts" setup>
import { PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'

const { routeTo } = usePageStore()
</script>

<template>
	<div class="view-page start-page">
		<div class="logo start-page__logo">
			Math Puzzles
		</div>
		<div class="privacy">
			<a
				href="https://docs.google.com/document/d/1Hk88865_6yvWeWvi25jErXQOD6Oi5-h2qEHW5d8P25Y"
				target="_blank"
				>Privacy Policy</a
			>
		</div>
		<button class="start-page__btn" @click="routeTo(PAGES.LEVELS)">
			<span>Start</span>
		</button>
	</div>
</template>

<style lang="scss" scoped>
.start-page {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	height: 100dvh;

	&__logo {
		position: absolute;
		top: 29%;
		left: 36%;
	}

	&__btn {
		position: absolute;
		bottom: 0;
		right: 0;
		z-index: 1;
		text-align: center;
		cursor: pointer;
		padding: 0;
		border: 0;
		outline: 0;
		width: 66px;
		height: 66px;
		background: url('@/assets/img/paper-green-color.jpg') no-repeat center;
		background-size: 100% 100%;
		box-shadow: -5px -5px 10px 0 rgba(0, 0, 0, 0.1);

		span {
			display: block;
			transform-origin: center;
			transform: translate(-13px, -13px) rotateZ(-45deg);
		}
	}

	.privacy {
		position: absolute;
		left: 28%;
		bottom: 43%;

		a {
			color: #020202;
			text-decoration: none;
			font-size: 12px;

			&:visited,
			&:active {
				color: #020202;
			}
		}
	}
}
</style>
