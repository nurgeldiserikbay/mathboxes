<script lang="ts" setup>
import { ref } from 'vue'
import { TransitionExpand } from '@limonische/vue3-transition-expand'

import HistoryTimeLevel from '@/components/HistoryTimeLevel.vue'

import { I_GameStatLevel, I_LEVEL } from '@/utils/types'
import { TIMES } from '@/utils/conts'

defineProps<{
	isActive: boolean
	level: I_LEVEL
	story: I_GameStatLevel
}>()

const $emits = defineEmits(['activate'])

const selectTime = ref(TIMES.MIN)
</script>

<template>
	<div class="h-level">
		<button class="h-level__btn" @click="$emits('activate')">
			<span>{{ `${$t(level.name)}` }}</span>
		</button>

		<TransitionExpand tag="div" class="h-level__body">
			<div v-if="isActive" class="h-level__body-in">
				<div class="h-level__head">
					<button
						v-for="time in TIMES"
						:key="time"
						:class="{ active: time === selectTime }"
						@click="selectTime = time"
					>
						{{ $t(time) }}
					</button>
				</div>

				<HistoryTimeLevel :story="story[selectTime]" />
			</div>
		</TransitionExpand>
	</div>
</template>

<style lang="scss" scoped>
.h-level {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;

	&__btn {
		width: 100%;
		padding: 5px 15px;
		cursor: pointer;
		display: flex;
		justify-content: flex-start;
		background: transparent;
		font-weight: 800;
		text-transform: capitalize;

		span {
			&:last-child {
				flex-grow: 1;
			}
		}
	}

	&__body {
		padding: 5px 0 0;
		flex-grow: 1;
		overflow: hidden;
	}

	&__body-in {
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}

	&__head {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		justify-content: space-between;
		margin-top: 0;
		margin-bottom: 10px;

		button {
			flex-grow: 1;
			flex-shrink: 0;
			background: linear-gradient(
				to bottom,
				rgba(1, 158, 219, 1),
				rgba(0, 78, 139, 1)
			);
			border: 1px solid rgba(255, 255, 255, 0.2);
			color: #ffffff;
			transition: 0.2s ease, 0.2s ease;
			cursor: pointer;

			&.active {
				background: transparent;
				border: 1px solid #020202;
				color: #020202;
			}
		}
	}
}
</style>
