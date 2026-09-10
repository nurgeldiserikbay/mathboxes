<script lang="ts" setup>
import { OPERATIONS } from '@/utils/conts'
import { alpha } from '@/utils/color'

import ModalSheet from '@/components/ModalSheet.vue'

/**
 * One reference sheet for all four operations. It is the only text in the game:
 * the board itself explains nothing, because it does not need to.
 */
const $emits = defineEmits(['close'])
</script>

<template>
	<ModalSheet :title="$t('help_title')" icon="info" @close="$emits('close')">
		<div
			v-for="op in OPERATIONS"
			:key="op.id"
			class="entry"
			:style="{ '--op': op.tint, '--op-soft': alpha(op.tint, 0.14), '--op-line': alpha(op.tint, 0.4) }"
		>
			<div class="entry__head">
				<span class="entry__glyph">{{ op.glyph }}</span>
				<span class="entry__name">{{ $t(op.name) }}</span>
			</div>
			<div class="entry__body" v-html="$t(op.description)" />
		</div>
	</ModalSheet>
</template>

<style lang="scss" scoped>
.entry {
	padding: 12px 0;

	& + & {
		box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.06);
	}

	&__head {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 7px;
	}

	/* Знак операции — та же плашка, что у шапки листа: справка и настройки
	   должны выглядеть одной программой. */
	&__glyph {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		flex: 0 0 34px;
		border-radius: 11px;
		font-size: 19px;
		font-weight: 900;
		color: #fff;
		background: linear-gradient(180deg, var(--op), color-mix(in srgb, var(--op) 70%, #000));
		box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.38), inset 0 -3px 0 rgba(0, 0, 0, 0.22),
			0 3px 0 rgba(0, 0, 0, 0.34);
	}

	&__name {
		font-size: 17px;
		font-weight: 900;
		color: #fff;
	}

	&__body {
		font-size: 14px;
		font-weight: 700;
		line-height: 1.5;
		color: var(--text-dim);
	}
}
</style>

<style lang="scss">
/*
   Не scoped: текст описаний приходит из i18n через `v-html`, и scoped-атрибут
   до этих узлов не доходит.

   `strong` здесь раньше был `#1a202c`, а `.expression strong` — `#a8752a`: оба
   цвета из светлой темы, на тёмном листе подпись «Пример:» просто исчезала.
*/
.entry__body {
	p {
		margin: 0;
	}

	strong {
		color: #fff;
	}

	.expression {
		display: block;
		margin: 8px 0 2px;
		padding: 8px 10px;
		border-radius: 12px;
		text-align: center;
		font-size: 20px;
		font-weight: 900;
		background: rgba(6, 9, 30, 0.42);
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.34);

		strong {
			color: var(--gold);
		}
	}
}
</style>
