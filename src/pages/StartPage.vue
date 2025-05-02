<script lang="ts" setup>
import { ref } from 'vue'

import IconInfo from '@/assets/img/info.svg'
import IconPlay from '@/assets/img/play.svg'

import { I_LEVEL } from '@/utils/types'

import { LEVELS } from '@/utils/conts'

import { useGameStore } from '@/store/gameStore'
import { useAudio } from '@/composables/useAudio'

import LevelDesc from '@/components/LevelDesc.vue'
import TimeTypes from '@/components/TimeTypes.vue'

const gameStore = useGameStore()
const { playAudio } = useAudio()

const descModal = ref<I_LEVEL>()
</script>

<template>
	<div class="page start-page">
		<div class="levels">
			<div
				v-for="level in LEVELS"
				:key="level.id"
				:style="{ background: level.bgColor }"
				class="level"
				@click="playAudio('click', true), gameStore.selectLevel(level.id)"
			>
				<div class="level__name">{{ $t(level.name) }}</div>
				<div class="level__sign">{{ level.sign }}</div>
				<button class="level__desc-btn" @click.stop="playAudio('click', true),descModal = level">
					<IconInfo :style="{ fill: level.infoIcon }" />
				</button>
				<button
					class="level__select-btn"
				>
					<IconPlay />
				</button>
			</div>
			
			<a href="https://docs.google.com/document/d/1zsuymqEMonMRWg1RoEIqpQpo4ThFwEOoOYgnL060GQk/edit?usp=sharing" target="_blank" class="privacy">{{ $t('privacy') }}</a>
		</div>

		<LevelDesc
			v-if="descModal"
			:item="descModal"
			@close="descModal = undefined"
		/>
		<TimeTypes v-if="gameStore.level !== null" @click.stop="" />
	</div>
</template>

<style lang="scss" scoped>
.start-page {
	padding-top: 95px;
	padding-bottom: 40px;
}

.levels {
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: stretch;
	gap: 15px;
	max-width: 350px;
	margin: 0 auto;
}

.level {
	position: relative;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 25px;
	padding-right: 85px;
	min-height: 100px;
	border-radius: 15px;
	background: linear-gradient(
		to bottom,
		rgba(255, 120, 120, 1),
		rgba(255, 190, 120, 1)
	);
	box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.4),
		inset 0px -2px 4px rgba(255, 255, 255, 0.2);
	border: 1px solid rgba(255, 255, 255, 0.2);
	transition: transform 0.2s ease, box-shadow 0.2s ease;
	cursor: pointer;

	&:hover {
		transform: translateY(-3px);
		box-shadow: 0px 8px 12px rgba(0, 0, 0, 0.6),
			inset 0px -2px 4px rgba(255, 255, 255, 0.1);
	}

	&__name {
		font-size: 25px;
		text-transform: capitalize;
		font-style: italic;
		font-weight: 700;
	}

	&__sign {
		font-size: 40px;
		font-style: italic;
		font-weight: 900;
		color: rgba(21, 67, 95, 0.9);
		line-height: 1;
	}

	&__desc-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		cursor: pointer;
		padding: 0;
		background: transparent;
		border: none;

		svg {
			width: 40px;
			height: 40px;
		}
	}

	&__select-btn {
		position: absolute;
		bottom: 6px;
		right: 8px;
		cursor: pointer;
		padding: 0;
		background: transparent;
		border: none;

		svg {
			width: 40px;
		}
	}
}

.privacy {
	display: block;
	margin: 25px auto;
	font-size: 20px;
	letter-spacing: 2px;
	padding: 10px 15px;
	cursor: pointer;
	color: #ffffff;
	text-decoration: none;
	text-align: center;
}
</style>

<style lang="scss">
.level {
	&__desc-btn {
		svg {
			path:first-child {
				fill: inherit !important;
			}
		}
	}
}
</style>
