<script lang="ts" setup>
import AppIcon from '@/components/AppIcon.vue'

import { BOONS } from '@/utils/boons'
import { TYPE_BOON } from '@/utils/types'
import { useAudio } from '@/composables/useAudio'

/**
 * Развилка: единственное место в игре, где игрок что-то решает.
 *
 * Три двери по трём разным осям — этажи, время, очки, — потому что три оттенка
 * одной безопасности выбором не были бы. Выйти отсюда, ничего не выбрав,
 * нельзя: подъём стоит и ждёт, и это правильно — решение должно стоить
 * внимания, иначе его не заметят.
 */
const $props = defineProps<{
	/** Высота, на которой открылась развилка. Она же и повод для неё. */
	floor: number
}>()

const $emits = defineEmits<{ choose: [TYPE_BOON] }>()

const { playAudio, vibrate } = useAudio()

function pick(kind: TYPE_BOON) {
	playAudio('click')
	vibrate('tap')
	$emits('choose', kind)
}
</script>

<template>
	<div class="fork">
		<div class="fork__box">
			<div class="fork__head">
				<span class="fork__crown">{{ $t('floor') }} {{ $props.floor }}</span>
				<h2 class="fork__title">{{ $t('fork_title') }}</h2>
				<span class="fork__note">{{ $t('fork_note') }}</span>
			</div>

			<button
				v-for="boon in BOONS"
				:key="boon.kind"
				class="door"
				type="button"
				:style="{ '--tint': boon.tint }"
				@click="pick(boon.kind)"
			>
				<span class="door__mark">
					<AppIcon :name="boon.icon" :size="22" />
				</span>
				<span class="door__text">
					<b class="door__name">{{ $t(boon.name) }}</b>
					<span class="door__note">{{ $t(boon.note) }}</span>
				</span>
				<AppIcon name="chevron-right" :size="16" class="door__go" />
			</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.fork {
	position: absolute;
	/* Ниже рекламной строки, как пауза и итог: `inset: 0` отсчитывается от
	   padding-box и попал бы под баннер. */
	top: var(--ad-band-k, 56px);
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 65;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	overscroll-behavior: contain;
	background: rgba(5, 8, 26, 0.72);
	backdrop-filter: blur(7px);
	animation: veil 200ms var(--soft) both;

	&__box {
		margin: auto;
		width: 100%;
		max-width: 340px;
		padding: 16px 16px 14px;
		border-radius: var(--r-card);
		background: linear-gradient(180deg, var(--sheet-top), var(--sheet-bot));
		box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.16),
			inset 0 -8px 0 rgba(0, 0, 0, 0.28), 0 7px 0 var(--panel-lip),
			0 26px 52px rgba(3, 5, 20, 0.66);
		animation: rise 240ms var(--pop) both;
	}

	&__head {
		margin-bottom: 14px;
		text-align: center;
	}

	/* Высота, на которую он поднялся, — она же и повод. Развилка приходит
	   наградой, а не окном: сначала игрок видит, что этаж встал, и только
	   потом — что у него есть выбор. */
	&__crown {
		display: block;
		font-size: 13px;
		font-weight: 900;
		letter-spacing: 2.2px;
		text-transform: uppercase;
		color: #fff0b8;
		text-shadow: -2px -2px 0 #8a5406, 2px -2px 0 #8a5406, -2px 2px 0 #8a5406,
			2px 2px 0 #8a5406, 0 4px 0 #4a2c04, 0 0 14px rgba(255, 190, 70, 0.55);
	}

	&__title {
		margin: 8px 0 2px;
		font-size: 19px;
		font-weight: 900;
		line-height: 1.15;
		color: #fff;
	}

	&__note {
		font-size: 10px;
		font-weight: 900;
		letter-spacing: 1.4px;
		text-transform: uppercase;
		color: var(--text-faint);
	}
}

.door {
	display: flex;
	align-items: center;
	gap: 11px;
	width: 100%;
	padding: 10px 11px;
	border: none;
	border-radius: 16px;
	cursor: pointer;
	text-align: left;
	background: rgba(255, 255, 255, 0.055);
	box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.09);
	transition: transform 120ms var(--soft), background 180ms var(--soft),
		box-shadow 180ms var(--soft);

	& + & {
		margin-top: 9px;
	}

	/* Цвет двери несёт смысл: зелёный — про построенное, голубой — про время,
	   золото — про очки. Один и тот же язык, что и в остальной игре. */
	&__mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 42px;
		height: 42px;
		flex: 0 0 42px;
		border-radius: 13px;
		color: #fff;
		background: linear-gradient(180deg, var(--tint), color-mix(in srgb, var(--tint) 68%, #000));
		box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.42),
			inset 0 -4px 0 rgba(0, 0, 0, 0.22), 0 3px 0 rgba(0, 0, 0, 0.4);
	}

	&__text {
		flex: 1;
		min-width: 0;
	}

	&__name {
		display: block;
		font-size: 15px;
		font-weight: 900;
		line-height: 1.2;
		color: #fff;
	}

	&__note {
		display: block;
		margin-top: 1px;
		font-size: 11.5px;
		font-weight: 800;
		line-height: 1.3;
		color: var(--text-dim);
	}

	&__go {
		flex: 0 0 auto;
		color: var(--text-faint);
	}

	&:active {
		transform: scale(0.98);
		background: color-mix(in srgb, var(--tint) 20%, transparent);
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--tint) 60%, transparent);
	}
}

@keyframes veil {
	from {
		opacity: 0;
	}
}

@keyframes rise {
	from {
		opacity: 0;
		transform: translateY(14px) scale(0.94);
	}
}
</style>
