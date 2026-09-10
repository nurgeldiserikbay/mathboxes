<script lang="ts" setup>
import { computed } from 'vue'

import type { TYPE_HAZARD } from '@/utils/locations'

/**
 * То, что ждёт внизу.
 *
 * Одна геометрия на все локации: верхняя кромка элемента и есть поверхность, а
 * тело уходит вниз на два экрана, чтобы при любом оседании мира под ним не
 * открылось пустоты. Меняется только вид — ряд по кромке и цвет тела.
 *
 * Ряд живёт файлом, как иконки и фоны: `assets/hazards/<вид>.svg`. Он замощён
 * по горизонтали, поэтому нарисован так, чтобы левый и правый края сходились —
 * заменить его на другой рисунок можно копированием файла, лишь бы кромка
 * осталась на той же высоте.
 */
const $props = defineProps<{ kind: TYPE_HAZARD }>()

const rows = import.meta.glob('../assets/hazards/*.svg', {
	eager: true,
	query: '?url',
	import: 'default',
}) as Record<string, string>

const row = computed(() => rows[`../assets/hazards/${$props.kind}.svg`] ?? '')
</script>

<template>
	<div class="hazard" :class="`is-${$props.kind}`" aria-hidden="true">
		<i class="hazard__crest" :style="{ backgroundImage: `url(${row})` }" />
		<i class="hazard__body" />
	</div>
</template>

<style lang="scss" scoped>
.hazard {
	position: absolute;
	/* Шире экрана: у кромки есть своё покачивание, и на краях не должно
	   открываться ничего. */
	left: -4%;
	right: -4%;
	top: 0;
	height: 200vh;
	z-index: 25;
	pointer-events: none;
	will-change: transform;
}

/*
   Ряд по кромке.

   Стоит НАД линией поверхности, а не под ней: сосульки и мухоморы растут вверх,
   и линия — это их основание, а не макушка. У воды и лавы то же самое работает
   как гребень волны.
*/
.hazard__crest {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 100%;
	/* Высота ряда задаёт и его масштаб: тайл тянется по высоте, ширина идёт
	   следом. Тридцать два — столько, чтобы шип и шляпка читались на телефоне,
	   и не столько, чтобы ряд спорил с башней. */
	height: 32px;
	background-repeat: repeat-x;
	/* По высоте — целиком, по ширине — как нарисовано: тянуть ряд по ширине
	   значит растягивать шляпки и шипы вместе с экраном. */
	background-size: auto 100%;
	background-position: bottom center;
	animation: hazard-swell 2.6s var(--soft) infinite;
}

.hazard__body {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, var(--haz-top), var(--haz-bot));
	box-shadow: inset 0 3px 0 var(--haz-glare);
}

/* Каждая локация — свой цвет и своё свечение. Свечение несёт смысл: лава
   светится сама, лёд отражает, вода бликует, а лес внизу не светится вовсе. */
.is-water {
	--haz-top: rgba(63, 168, 234, 0.86);
	--haz-bot: rgba(24, 82, 160, 0.94);
	--haz-glare: rgba(255, 255, 255, 0.34);

	.hazard__crest {
		filter: drop-shadow(0 0 12px rgba(90, 200, 255, 0.55));
	}
}

.is-lava {
	--haz-top: rgba(226, 78, 22, 0.94);
	--haz-bot: rgba(108, 20, 12, 0.96);
	--haz-glare: rgba(255, 214, 120, 0.5);

	.hazard__crest {
		filter: drop-shadow(0 0 16px rgba(255, 140, 40, 0.75));
	}

	/* Расплав дышит: тело светлеет и темнеет само по себе. Без этого лава
	   читается оранжевой заливкой, а не веществом. */
	.hazard__body {
		animation: hazard-glow 3.4s var(--soft) infinite;
	}
}

.is-ice {
	--haz-top: rgba(143, 214, 242, 0.92);
	--haz-bot: rgba(38, 92, 146, 0.95);
	--haz-glare: rgba(255, 255, 255, 0.55);

	.hazard__crest {
		filter: drop-shadow(0 0 10px rgba(180, 235, 255, 0.5));
	}
}

.is-spores {
	--haz-top: rgba(61, 42, 78, 0.95);
	--haz-bot: rgba(24, 16, 34, 0.97);
	--haz-glare: rgba(255, 210, 180, 0.18);
}

/*
   Покачивание кромки.

   Только по вертикали и на пару пикселей: это признак живого вещества, а не
   событие. Сдвигать ряд вбок нельзя — мухоморы поехали бы по земле.
*/
@keyframes hazard-swell {
	0%,
	100% {
		transform: translate3d(0, 0, 0);
	}
	50% {
		transform: translate3d(0, 2.5px, 0);
	}
}

@keyframes hazard-glow {
	0%,
	100% {
		filter: brightness(1);
	}
	50% {
		filter: brightness(1.16);
	}
}
</style>
