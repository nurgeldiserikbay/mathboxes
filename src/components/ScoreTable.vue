<template>
	<div class="score-table">
		<div class="score-table__move">
			<span>Score:</span>
			<span v-if="gameStore.curGameStat">{{
				gameStore.curGameStat.score
			}}</span>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'

import { useGameStore } from '@/store/gameStore'
import { useAdsStore } from '@/store/adsStore'

import Admob from '@/utils/admob'

const gameStore = useGameStore()
const adsStore = useAdsStore()

watch(
	() => gameStore.curGameStat,
	() => {
		if (import.meta.env.VITE_APP_MODE !== 'TEST') {
			adsStore.toggleLoading(true)
			Admob.interstitial({
				isFirst: false,
				onInterstitialAdClosed: () => {
					adsStore.toggleLoading(false)
				},
			})
		}
	},
	{ immediate: true }
)
</script>

<style lang="scss" scoped>
@import '@/assets/_common.scss';

.score-table {
	display: flex;
	align-items: center;
	gap: 25px;

	@media screen and (max-width: $media-mdphone) {
		justify-content: center;
		flex-direction: column;
		gap: 0px 15px;
		flex-wrap: wrap;
	}

	&__move {
		display: flex;
		align-items: center;
		gap: 15px;
		color: #fff;

		span {
			&:last-child {
				text-align: center;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;

				@media screen and (max-width: $media-tablet) {
					min-width: unset;
				}
			}

			&:last-child {
				font-size: 22px;
				color: #fecb23;
			}
		}
	}
}
</style>
