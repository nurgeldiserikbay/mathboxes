<script lang="ts" setup>
import { ref, computed, onBeforeUnmount } from 'vue'

import { LEVELS, PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

const { routeTo } = usePageStore()
const { activeLevels, clickLevel, gameStats } = useGameStore()

const isActive = computed(() => (level: number) => {
	return activeLevels[level]
})
const someActive = computed(() => {
	return Object.values(activeLevels).length
})
let timerId: ReturnType<typeof setTimeout>
</script>

<template>
	<div class="view-page levels-page">
		<div class="levels-page__title">Select operators</div>
		<div class="levels-page__list">
			<button
				v-for="level in LEVELS"
				:key="level.id"
				class="levels-page__item level"
				:class="{ 'level--active': isActive(level.id) }"
				@click="clickLevel(level.id)"
			>
				<div class="level__info">
					<span class="level__row level__row--level">{{ level.id + ')' }}</span>
					<span class="level__row level__row--level">{{ level.title }}</span>
					<span class="level__row level__row--level">{{ level.definition.join(', ') }}</span>
				</div>
				<div class="level__check">
					<span>+</span>
				</div>
			</button>
		</div>
		<button v-if="someActive" class="levels-page__btn" @click="routeTo(PAGES.PLAYGROUND)">
			<span>Play</span>
		</button>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_common.scss';

.levels-page {
	position: relative;
	padding-top: 35px;

	&__title {
		font-size: 24px;
		text-align: center;
		margin-bottom: 20px;
	}

	&__list {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		gap: 15px;
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
		background: url('@/assets/img/paper-white-color.png') no-repeat center;
		background-size: 100% 100%;
		box-shadow: -5px -5px 10px 0 rgba(0, 0, 0, 0.1);

		span {
			display: block;
			transform-origin: center;
			transform: translate(-6px, -6px) rotateZ(-45deg);
		}
	}

	.level {
		position: relative;
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 1.2rem;
		gap: 25px;
		cursor: pointer;
		width: 100%;
		box-sizing: border-box;
		padding: 0 25px;
		background: transparent;
		border: none;
		outline: none;

		&__info {
			display: flex;
			align-items: center;
			color: #020202;
		}

		&__row {
			&:nth-child(2) {
				padding-left: 15px;
				width: 120px;
				text-align: left;
			}

			&:nth-child(3) {
				font-size: 24px;
				line-height: 1;
			}
		}

		&__check {
			border: 1px solid #020202;
			padding: 0px 10px;
			line-height: 1;

			span {
				opacity: 0;
			}
		}

		&--active .level__check span {
			opacity: 1;
		}
	}
}
</style>
