<script lang="ts" setup>
import { computed } from 'vue'
import type { Component } from 'vue'


/**
 * Комната, в которой идёт игра.
 *
 * Небо задаётся снаружи по имени и всю партию не меняется. Раньше здесь жила
 * своя лестница зон по высоте, и небо переползало из одного в другое каждые
 * двадцать этажей; от неё отказались вместе с самой затеей менять место по
 * ходу подъёма — высота тут про рекорд, а не про путешествие.
 *
 * Силуэты — файлы: `assets/backdrops/<zone>-<plane>.svg`. Заменить слой
 * рисованным экспортом — копирование файла. Цвет приходит из `--layer`, своего
 * для каждого плана, поэтому один рисунок служит и бледной далью, и тёмным
 * передним планом.
 *
 * Облака — тоже рисунок, и это намеренно. Раньше это были размытые радиальные
 * градиенты: дёшево и переживает любое соотношение сторон — но у размытого
 * пятна нет формы, а небо из градиента и пяти пятен и есть то самое «плоско».
 * Теперь это перекрывающиеся круги с холодным низом, и две свои краски они
 * берут из переменных, поэтому один рисунок работает и днём, и на закате, и
 * ночью.
 */
const $props = withDefaults(
	defineProps<{
		/** На какой высоте игрок. Отсюда только отдаление планов. */
		floor?: number
		/** Какое небо. Имя зоны — оно же имя файлов её планов. */
		zone?: string
	}>(),
	{ floor: 0, zone: 'city' }
)

const art = import.meta.glob('../assets/backdrops/*.svg', {
	eager: true,
	query: '?component',
	import: 'default',
}) as Record<string, Component>

function plane(zone: string, name: 'far' | 'near'): Component | null {
	return art[`../assets/backdrops/${zone}-${name}.svg`] ?? null
}

const clouds = computed(() => art['../assets/backdrops/clouds.svg'] ?? null)

const current = computed(() => $props.zone)

/** Главный экран стоит в дневном небе, и гасить его нечем и незачем. */
const home = computed(() => current.value === 'day')

/**
 * Насколько игрок поднялся — от нуля до единицы.
 *
 * Отсюда идёт отдаление планов. Шестьдесят этажей взяты как высота, выше
 * которой добавлять уже нечего: земля к этому времени ушла настолько, насколько
 * может.
 */
const progress = computed(() => Math.min(1, Math.max(0, $props.floor / 60)))

/**
 * The ground recedes as the player climbs: both planes drift down, the near one
 * faster. It is the trick a stage set uses — nothing moves except away.
 */
function drift(rate: number) {
	return { transform: `translate3d(0, ${(progress.value * rate).toFixed(1)}px, 0)` }
}

/**
 * Звёзды имеют смысл только там, где небо достаточно тёмное, чтобы их держать.
 *
 * Раньше их яркость считалась от места зоны в лестнице — теперь лестницы нет, и
 * держать звёзды может только сама зона.
 */
const STARLIT: Record<string, number> = { night: 0.85, space: 1 }
const starlight = computed(() => STARLIT[current.value] ?? 0)
</script>

<template>
	<div class="sky" aria-hidden="true">
		<div class="dome" :class="`is-${current}`" />

		<div class="stars" :style="{ opacity: starlight }" />

		<!-- Two passes of the same drawing at different scales and speeds. Clouds
		     going one way at one speed read as a camera move; two speeds read as
		     weather. -->
		<div class="clouds" :class="`tint-${current}`">
			<component :is="clouds" class="cloudband cloudband--far" />
			<component :is="clouds" class="cloudband cloudband--mid" />
			<component :is="clouds" class="cloudband cloudband--near" />
		</div>

		<div class="band" :class="`zone-${current}`">
			<component :is="plane(current, 'far')" class="plane plane--far" :style="drift(26)" />
			<component :is="plane(current, 'near')" class="plane plane--near" :style="drift(64)" />
		</div>

		<!-- Haze at the horizon and a vignette at the edges: this is what keeps
		     the background quieter than the tower standing in front of it. -->
		<div class="haze" :class="{ 'is-soft': home }" />
	</div>
</template>

<style lang="scss" scoped>
.sky {
	position: absolute;
	inset: 0;
	overflow: hidden;
	pointer-events: none;
}

.dome {
	position: absolute;
	inset: 0;
	transition: opacity 700ms var(--soft);
}

/* Каждая зона — своя высота солнца. Стопов много намеренно: на трёх небо
   становится градиентной плашкой, а нужно, чтобы у горизонта был воздух. */

/* Дневное небо главного экрана: светлое, без заката, с воздухом у земли. */
.is-day {
	background: radial-gradient(120% 46% at 50% 92%, rgba(255, 255, 255, 0.7), transparent 62%),
		linear-gradient(
			180deg,
			#1f7ae0 0%,
			#2f8fe8 14%,
			#46a4ee 28%,
			#63b8f2 42%,
			#84cbf6 56%,
			#a7dcf8 68%,
			#c8e8f8 78%,
			#e3f2f6 88%,
			#f2f8f2 100%
		);
}

.is-city {
	background: radial-gradient(120% 58% at 50% 96%, rgba(255, 198, 142, 0.62), transparent 64%),
		linear-gradient(
			180deg,
			#1e5cc8 0%,
			#2a72e0 11%,
			#3d8ae8 23%,
			#5c9cea 35%,
			#8199e2 46%,
			#a98ed2 56%,
			#d087b4 66%,
			#f09a92 76%,
			#ffba86 85%,
			#ffd2a2 91%,
			#7c5e98 96%,
			#4a3a70 100%
		);
}

.is-valley {
	background: radial-gradient(120% 54% at 50% 92%, rgba(255, 244, 186, 0.56), transparent 62%),
		linear-gradient(
			180deg,
			#1c56c4 0%,
			#2a7ad2 16%,
			#3f9ede 34%,
			#63c0e2 50%,
			#96d8d2 62%,
			#c2e6b4 72%,
			#a2c886 82%,
			#5f8460 92%,
			#334a3a 100%
		);
}

/* Зима: солнце низкое, воздух холодный, у земли снежная дымка. */
.is-winter {
	background: radial-gradient(120% 50% at 50% 94%, rgba(255, 255, 255, 0.72), transparent 64%),
		linear-gradient(
			180deg,
			#2a5aa8 0%,
			#3a76c4 14%,
			#5194d8 28%,
			#74b2e6 42%,
			#9ccdee 55%,
			#c3e2f2 68%,
			#dcecf4 80%,
			#eef4f6 90%,
			#f6f9fa 100%
		);
}

.is-canyon {
	background: radial-gradient(120% 56% at 50% 94%, rgba(255, 176, 106, 0.58), transparent 62%),
		linear-gradient(
			180deg,
			#3a2a86 0%,
			#5e2f80 16%,
			#95457a 32%,
			#c8626a 46%,
			#e88a5e 58%,
			#f9b264 70%,
			#d4834c 82%,
			#8c4e38 92%,
			#4c2c24 100%
		);
}

.is-night {
	background: radial-gradient(96% 44% at 50% 88%, rgba(140, 180, 255, 0.42), transparent 64%),
		linear-gradient(
			180deg,
			#0a1240 0%,
			#122058 18%,
			#1c3080 36%,
			#2a44a0 52%,
			#3b54ab 66%,
			#4e5aa4 78%,
			#3a3672 90%,
			#1e1a44 100%
		);
}

.is-space {
	background: radial-gradient(84% 46% at 22% 26%, rgba(178, 118, 255, 0.62), transparent 66%),
		radial-gradient(74% 42% at 80% 62%, rgba(64, 200, 246, 0.48), transparent 64%),
		linear-gradient(180deg, #150c3c 0%, #22114f 30%, #331862 58%, #241150 82%, #120a30 100%);
}

/* Звёзды: точки трёх размеров по десяти позициям. Дешевле любого спрайта и
   не тайлится видимым швом. */
.stars {
	position: absolute;
	inset: 0;
	transition: opacity 700ms var(--soft);
	background-repeat: no-repeat;
	background-image: radial-gradient(1.5px 1.5px at 12% 8%, #fff 50%, transparent 51%),
		radial-gradient(1.2px 1.2px at 34% 15%, #fff 50%, transparent 51%),
		radial-gradient(1.7px 1.7px at 62% 6%, #fff 50%, transparent 51%),
		radial-gradient(1.2px 1.2px at 82% 17%, #fff 50%, transparent 51%),
		radial-gradient(1.1px 1.1px at 22% 24%, #fff 50%, transparent 51%),
		radial-gradient(1.4px 1.4px at 71% 27%, #fff 50%, transparent 51%),
		radial-gradient(1.1px 1.1px at 47% 33%, #fff 50%, transparent 51%),
		radial-gradient(1.6px 1.6px at 92% 11%, #fff 50%, transparent 51%),
		radial-gradient(1.2px 1.2px at 8% 40%, #fff 50%, transparent 51%),
		radial-gradient(1.3px 1.3px at 57% 45%, #fff 50%, transparent 51%);
	mask-image: linear-gradient(180deg, #000 0%, #000 44%, transparent 62%);
}

/* ------------------------------------------------------------- ОБЛАКА --- */
.clouds {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	height: 74%;
	overflow: hidden;
	/* Цвет облака задаётся зоной, а не файлом: одна и та же форма работает и
	   в дневном небе, и в закате, и ночью. */
	--cloud-hi: #ffffff;
	--cloud-lo: #d7e5fa;
}

/*
   Три прохода одного рисунка на разных высотах и скоростях.

   Дрейф идёт трансформом, а не `margin-left`: сдвиг отступа — это пересчёт
   вёрстки на каждом кадре, три таких слоя на среднем Android съедали кадр
   впустую. Масштаб задаётся шириной элемента, а не `scale`, чтобы трансформ
   остался свободен под движение.
*/
.cloudband {
	position: absolute;
	height: auto;
	will-change: transform;
	animation: drift linear infinite alternate;

	&--far {
		left: -22%;
		width: 118%;
		top: 1%;
		opacity: 0.58;
		animation-duration: 105s;
	}

	&--mid {
		left: -14%;
		width: 132%;
		top: 26%;
		opacity: 0.46;
		animation-duration: 128s;
		animation-direction: alternate-reverse;
	}

	&--near {
		left: -18%;
		width: 142%;
		top: 12%;
		/* На доске облака — фон, а не сюжет: в полную силу они спорят с башней
		   за внимание. Плотными остаются только на главной, где спорить не с
		   чем. */
		opacity: 0.62;
		animation-duration: 74s;
		animation-direction: alternate-reverse;
	}
}

.tint-day {
	.cloudband--near {
		opacity: 0.95;
	}

	.cloudband--far {
		opacity: 0.66;
	}
}

@keyframes drift {
	from {
		transform: translate3d(-3%, 0, 0);
	}
	to {
		transform: translate3d(3%, 0, 0);
	}
}

.tint-city {
	--cloud-hi: #fff3e6;
	--cloud-lo: #e6b9c6;
}

.tint-valley {
	--cloud-hi: #ffffff;
	--cloud-lo: #cfe6dc;
}

.tint-winter {
	--cloud-hi: #ffffff;
	--cloud-lo: #c6d9ea;
}

.tint-canyon {
	--cloud-hi: #ffe6cc;
	--cloud-lo: #d09a86;
}

.tint-night {
	--cloud-hi: #b9c8ee;
	--cloud-lo: #6274ac;
}

.tint-space {
	--cloud-hi: #c8b0f0;
	--cloud-lo: #6a4aa8;
}

.band {
	position: absolute;
	inset: 0;
	transition: opacity 900ms var(--soft);
}

/* Планы силуэтов. Цвет задаётся здесь, а не в файле: один и тот же рисунок
   работает и дальним планом, и ближним. */
.plane {
	position: absolute;
	left: -4%;
	width: 108%;
	display: block;
	transition: transform 620ms var(--soft);

	&--far {
		bottom: 21%;
		height: 30%;
		--layer: #6b6fb8;
		opacity: 0.38;
		filter: blur(1px);
	}

	&--near {
		bottom: 8%;
		height: 34%;
		--layer: #3b3170;
		opacity: 0.9;
	}
}

/* Зелень и камень не могут быть того же цвета, что городской бетон. */
.zone-valley .plane--far {
	--layer: #4e8f7e;
}
.zone-valley .plane--near {
	--layer: #2c5f42;
}
/* Снег не силуэт: дальние гряды почти белые, ельник — холодная синь. */
.zone-winter .plane--far {
	--layer: #b9d4e8;
	opacity: 0.62;
}
.zone-winter .plane--near {
	--layer: #5c7a9c;
}
.zone-canyon .plane--far {
	--layer: #a5647a;
}
.zone-canyon .plane--near {
	--layer: #6b3340;
}
.zone-night .plane--far {
	--layer: #3a4590;
}
.zone-night .plane--near {
	--layer: #1c2560;
}
.zone-space .plane--far {
	--layer: #52379c;
	opacity: 0.5;
}
.zone-space .plane--near {
	--layer: #2e1e64;
}

/* Дневная зона рисует свои планы своими же цветами — там зелень и светлый
   город, а не силуэт. */
.zone-day .plane--far {
	bottom: 24%;
	opacity: 0.85;
	filter: blur(0.6px);
}
.zone-day .plane--near {
	bottom: 0;
	height: 40%;
	opacity: 1;
}

/*
   Дымка и виньетка. Раньше здесь стояло затемнение 0.52 сверху и 0.4 по краям —
   именно оно и делало игру тусклой: небо рисовалось ярким, а потом гасилось
   двумя тёмными слоями поверх. Осталось ровно столько, сколько нужно, чтобы
   белая карточка примера и панели HUD не висели в пустоте.
*/
.haze {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, rgba(8, 12, 34, 0.2) 0%, rgba(8, 12, 34, 0) 18%),
		linear-gradient(180deg, transparent 58%, rgba(255, 216, 170, 0.2) 70%, transparent 84%),
		radial-gradient(150% 78% at 50% 54%, transparent 52%, rgba(10, 14, 40, 0.2) 100%);

	/* На главной затемнять нечего: там нет ни HUD, ни белой карточки, а день
	   должен остаться днём. */
	&.is-soft {
		background: radial-gradient(150% 82% at 50% 46%, transparent 62%, rgba(10, 40, 70, 0.14) 100%);
	}
}
</style>
