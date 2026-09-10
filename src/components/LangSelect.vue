<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAudio } from '@/composables/useAudio'
import { useGameStore } from '@/store/gameStore'

const i18n = useI18n()
const { playAudio } = useAudio()
const gameStore = useGameStore()

/** Endonyms: a language is easiest to find written in itself. */
const NATIVE: { [key: string]: string } = {
	de: 'Deutsch',
	en: 'English',
	es: 'Español',
	fr: 'Français',
	kk: 'Қазақша',
	ru: 'Русский',
}

const locales = computed(() =>
	// `availableLocales` is shared state; sorting a copy avoids mutating it.
	i18n.availableLocales.slice().sort((a, b) => (a < b ? -1 : 1))
)

function selectLang(lang: string) {
	playAudio('click')
	i18n.locale.value = lang
	// Remembered across launches; before this the device language won every time.
	gameStore.setLocale(lang)
}
</script>

<template>
	<div class="langs">
		<button
			v-for="locale in locales"
			:key="locale"
			:class="{ 'is-active': locale === i18n.locale.value }"
			:aria-pressed="locale === i18n.locale.value"
			class="langs__item"
			type="button"
			@click="selectLang(locale)"
		>
			<span class="langs__code">{{ locale }}</span>
			<span class="langs__name">{{ NATIVE[locale] ?? locale }}</span>
		</button>
	</div>
</template>

<style lang="scss" scoped>
.langs {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;

	&__item {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 9px 10px;
		border: none;
		border-radius: 13px;
		cursor: pointer;
		text-align: left;
		background: rgba(255, 255, 255, 0.05);
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.08);
		transition: transform 110ms var(--soft), box-shadow 160ms var(--soft),
			background 160ms var(--soft);

		&:active {
			transform: scale(0.97);
		}
	}

	/* Код языка — плашка, а не текст: две буквы сами по себе не читаются как
	   элемент, и строка распадалась на набор слов. */
	&__code {
		flex: 0 0 34px;
		padding: 3px 0;
		border-radius: 8px;
		text-align: center;
		font-size: 11px;
		font-weight: 900;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		color: var(--text-dim);
		background: rgba(255, 255, 255, 0.09);
	}

	&__name {
		font-size: 14px;
		font-weight: 800;
		color: var(--text-dim);
	}

	.is-active {
		background: rgba(118, 87, 232, 0.24);
		box-shadow: inset 0 0 0 2px rgba(154, 128, 255, 0.65),
			0 0 16px rgba(118, 87, 232, 0.32);

		.langs__code {
			color: #fff;
			@include face(#9280f7, #7b62e8, #6246d6);
			box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
		}

		.langs__name {
			color: #fff;
		}
	}
}
</style>
