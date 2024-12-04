<script lang="ts" setup>
import { I_GameStat } from '@/utils/types'

defineProps<{
	story: I_GameStat[]
}>()
</script>

<template>
	<div class="ht-level">
		<div v-if="story?.length" class="ht-level__table">
			<div class="ht-level__row">
				<div class="head">{{ $t('name') }}</div>
				<div class="head">{{ $t('score') }}</div>
				<div class="head">{{ $t('date') }}</div>
			</div>
			<div class="ht-level__row-body">
				<div
					v-for="(item, itemInd) in story"
					:key="itemInd"
					class="ht-level__row"
				>
					<div>{{ item.name }}</div>
					<div class="score">{{ item.score }}</div>
					<div class="date">
						{{
							`${new Date(item.date).toLocaleDateString()}-${new Date(
								item.date
							).toLocaleTimeString('ru', {hour: '2-digit', minute:'2-digit'})}`
						}}
					</div>
				</div>
			</div>
		</div>
		<div v-else class="ht-level__record">
			{{ $t('no_records') }}
		</div>
	</div>
</template>

<style lang="scss" scoped>
.ht-level {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;

	&__table {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}

	&__row {
		display: grid;
		grid-template-columns: 2fr 2fr 3fr;
		gap: 5px;
		border-bottom: 1px solid #020202;
		align-items: center;
		padding: 0 5px;
	}

	&__row-body {
		flex-grow: 1;
		overflow-y: auto;
		font-size: 14px;
		font-weight: 500;
	}

	&__record {
		text-align: center;
		font-size: 22px;
		margin-top: 15px;
	}

	.head {
		text-align: center;
		font-weight: 600;
	}

	.score {
		text-align: center;
	}

	.date {
		font-size: 11px;
		text-align: center;
	}
}
</style>
