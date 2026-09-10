<script lang="ts" setup>
import { computed, ref } from 'vue'

import AppIcon from '@/components/AppIcon.vue'

import { useAdsStore } from '@/store/adsStore'
import { pickPromo, storeUrl } from '@/utils/promo'

/**
 * Место под баннер — всегда занятое.
 *
 * Раньше высота слота появлялась вместе с рекламой: приходил баннер — вёрстка
 * прыгала вниз, не приходил — сверху оставалась пустая полоса. Теперь строка
 * зарезервирована с самого начала и никогда не пустует.
 *
 * Что в ней стоит, решает не этот компонент, а наличие настоящего объявления:
 * нативный баннер рисуется поверх вебвью и просто закрывает эту строку собой.
 * Пока его нет — не загрузился, нет заполнения, нет сети или это вообще
 * веб-версия — в строке живёт одна из наших же игр.
 *
 * Игра выбирается один раз при создании слота, а не по таймеру: строка стоит
 * над доской, на которой идёт счёт времени, и ничего мелькающего там быть не
 * должно.
 */
const adsStore = useAdsStore()

const game = ref(pickPromo())

/** Иконки живут файлами, как и всё остальное; грузится только выбранная. */
const icons = import.meta.glob('../assets/promo/*.webp', {
	eager: true,
	query: '?url',
	import: 'default',
}) as Record<string, string>

const icon = computed(() => icons[`../assets/promo/${game.value.slug}.webp`] ?? '')
const href = computed(() => storeUrl(game.value))
</script>

<template>
	<div class="slot">
		<!--
			`target="_blank"` — так же, как ссылка на политику на главной: Capacitor
			отдаёт внешний адрес системному браузеру, и никакого плагина для этого
			не нужно. Уход из приложения скрывает вебвью, а на это доска уже
			реагирует паузой — случайное касание не стоит игроку партии.
		-->
		<a
			v-if="!adsStore.bannerLive"
			class="house"
			:href="href"
			target="_blank"
			rel="noopener"
		>
			<img class="house__icon" :src="icon" :alt="game.title" width="40" height="40" />

			<span class="house__text">
				<span class="house__label">{{ $t('promo_label') }}</span>
				<b class="house__title">{{ game.title }}</b>
			</span>

			<span class="house__go">
				{{ $t('promo_open') }}
				<AppIcon name="play" :size="11" />
			</span>
		</a>
	</div>
</template>

<style lang="scss" scoped>
.slot {
	position: absolute;
	left: 0;
	right: 0;
	/*
	   Полоса занимает всю рекламную зону — от самой кромки экрана и до низа
	   объявления.

	   Раньше она сама была отодвинута вниз на системный инсет, потому что на
	   Android 15+ плагин так отодвигает нативный баннер. Но отодвигалась она
	   всегда, а не только когда баннер есть, — и над кросс-промо оставалась
	   пустая кромка. Теперь начало у полосы одно и то же, а растёт она вниз:
	   инсет входит в её высоту, а не в её отступ.
	*/
	top: 0;
	height: var(--ad-band, 56px);
	z-index: 4;
	overflow: hidden;
	/* Слот темнее неба: строка должна читаться как техническая полоса, а не как
	   часть игры, иначе игрок принимает её за элемент интерфейса. */
	background: linear-gradient(180deg, #10173a, #0a0e26);
	box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.08);
}

.house {
	display: flex;
	align-items: center;
	gap: 10px;
	/* Прижато к низу зоны: если инсет есть, объявление встанет именно там, и
	   кросс-промо должно стоять на его месте, а не над ним. */
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: var(--ad-slot, 56px);
	padding: 0 12px;
	text-decoration: none;

	&__icon {
		flex: 0 0 40px;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.14), 0 2px 6px rgba(4, 6, 22, 0.6);
	}

	&__text {
		flex: 1;
		min-width: 0;
	}

	&__label {
		display: block;
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 1.4px;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	&__title {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 14px;
		font-weight: 900;
		color: #fff;
	}

	&__go {
		display: flex;
		align-items: center;
		gap: 5px;
		flex: 0 0 auto;
		padding: 6px 11px;
		border-radius: 11px;
		font-size: 11px;
		font-weight: 900;
		letter-spacing: 0.8px;
		text-transform: uppercase;
		color: #fff;
		@include face(#9280f7, #7b62e8, #6246d6);
		@include raised(#3f2ba0, 3px, 0.5, 0.2, 0.4);
	}

	&:active .house__go {
		@include press(3px);
	}
}
</style>
