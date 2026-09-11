<script lang="ts" setup>
import { computed, ref } from 'vue'

import { useGameStore } from '@/store/gameStore'
import { usePageStore } from '@/store/pageStore'
import { useAudio } from '@/composables/useAudio'

import AppIcon from '@/components/AppIcon.vue'
import GameSky from '@/components/GameSky.vue'
import LogoItem from '@/components/LogoItem.vue'
import SettingBlock from '@/components/SettingBlock.vue'
import OtherGames from '@/components/OtherGames.vue'
import HelpSheet from '@/components/HelpSheet.vue'

import Mascot from '@/assets/mascot/cube.svg?component'

import { floorTint } from '@/utils/floors'
import { groupDigits } from '@/utils/format'

/**
 * The front door.
 *
 * One screen, one tap. There is one mode and nothing to configure, so the only
 * things here are the button, the number the player is trying to beat, and the
 * sky — but unlike the board, this sky is broad daylight. The board is a climb
 * through evening into night; the menu is the morning you set out in.
 */
const gameStore = useGameStore()
const pageStore = usePageStore()
const { playAudio, vibrate } = useAudio()

const settings = ref(false)
const isOtherGames = ref(false)
const help = ref(false)

const bestFloor = computed(() => gameStore.bestFloor)
/** The record wears the colour of the height it stands at. */
const bestTint = computed(() => floorTint(bestFloor.value))

/** Which build this is. The one thing on the screen that is for us, not for the
 *  player — and the fastest way to tell a stale install from a real bug. */
const buildId = __BUILD_ID__

function play() {
	playAudio('click')
	vibrate('tap')
	pageStore.startRun()
}

function openSettings() {
	playAudio('click')
	settings.value = true
}
</script>

<template>
	<div class="start">
		<GameSky zone="day" />

		<header class="start__top">
			<button
				class="round"
				type="button"
				:aria-label="$t('settings')"
				@click="openSettings"
			>
				<AppIcon name="gear" :size="20" />
			</button>

			<!-- The one number that carries over between runs, in the corner where
			     a coin counter lives in every game of this shape. -->
			<div v-if="gameStore.bestScore" class="purse">
				<AppIcon name="crown" :size="18" />
				<b class="num">{{ groupDigits(gameStore.bestScore) }}</b>
			</div>
		</header>

		<main class="start__main">
			<LogoItem />
		</main>

		<div class="start__cta">
			<!--
				Маскот стоит вплотную над кнопкой, а не посередине экрана.

				Пока он был в центре, между ним и кнопками собирался весь свободный
				зазор и середина читалась пустой. Внизу он оказывается «на земле» —
				там же, где зелёная кромка, — и заодно связывает надпись сверху с
				кнопкой снизу вместо того, чтобы висеть между ними.
			-->
			<Mascot class="mascot" role="img" :aria-label="$t('tagline')" />

			<div class="best" :style="{ '--tint': bestTint }">
				<template v-if="bestFloor">
					<span class="cap">{{ $t('best_floor') }}</span>
					<b class="best__value num">{{ bestFloor }}</b>
				</template>
				<span v-else class="best__empty">{{ $t('first_climb') }}</span>
			</div>

			<button class="big big--play" type="button" @click="play">
				<span class="big__mark"><AppIcon name="play" :size="17" /></span>
				<span class="big__label">{{ $t('start') }}</span>
			</button>

			<button class="big big--settings" type="button" @click="openSettings">
				<span class="big__mark big__mark--dim"><AppIcon name="gear" :size="15" /></span>
				<span class="big__label big__label--small">{{ $t('settings') }}</span>
			</button>
		</div>

		<footer class="start__foot">
			<button class="link" type="button" @click="playAudio('click'), (help = true)">
				<AppIcon name="info" :size="14" />
				{{ $t('help_ops') }}
			</button>

			<div class="start__meta">
				<span v-if="gameStore.records.gamesPlayed" class="totals">
					<span class="num">{{ gameStore.records.gamesPlayed }}</span>
					{{ $t('stat_games').toLowerCase() }}
				</span>
				<button
					class="link link--quiet"
					type="button"
					@click="isOtherGames = true"
				>
					{{ $t('other_games') }}
				</button>
				<a
					href="https://docs.google.com/document/d/1zsuymqEMonMRWg1RoEIqpQpo4ThFwEOoOYgnL060GQk/edit?usp=sharing"
					target="_blank"
					rel="noopener"
					class="link link--quiet"
					>{{ $t('privacy') }}</a
				>
				<span class="build">{{ buildId }}</span>
			</div>
		</footer>

		<SettingBlock :open="settings" @close="settings = false" />

		<OtherGames v-if="isOtherGames" @close="isOtherGames = false" />
		<HelpSheet v-if="help" @close="help = false" />
	</div>
</template>

<style lang="scss" scoped>
.start {
	position: relative;
	display: flex;
	flex-direction: column;
	min-height: 100dvh;
	padding: 12px 18px calc(18px + env(safe-area-inset-bottom, 0px));
	max-width: 430px;
	margin: 0 auto;
	overflow: hidden;

	// Планшет: тот же экран, просто не узкая полоса посередине.
	@media (min-width: 600px) {
		max-width: 560px;
		padding-left: 28px;
		padding-right: 28px;
	}

	&__top {
		position: relative;
		z-index: 5;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	/* Логотип занимает верхнюю половину и стоит по её центру. */
	&__main {
		position: relative;
		z-index: 5;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 0;
	}

	&__cta {
		position: relative;
		z-index: 5;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 6px;
	}

	/*
	   Подвал отодвинут от кнопок.

	   Раньше он стоял в восьми пикселях под «Настройками», а сам сидел почти на
	   нижней кромке: две строки мелкого текста оказывались зажаты между кнопкой
	   и краем экрана и читались её продолжением. Забирает это место у логотипа
	   сверху — он и так занимает всю свободную высоту.
	*/
	&__foot {
		position: relative;
		z-index: 5;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding-top: 18px;
	}

	&__meta {
		display: flex;
		align-items: center;
		gap: 9px;
	}
}

/* ============================================================== ШАПКА === */
.round {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	padding: 0;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	color: #fff;
	@include face(#9280f7, #7b62e8, #6246d6);
	@include raised(#3f2ba0, 4px, 0.54, 0.22, 0.5, 2.5px);
	transition: transform 120ms var(--soft), filter 120ms var(--soft);

	&:active {
		@include press(4px);
	}
}

.purse {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 13px 7px;
	border-radius: 999px;
	font-size: 15px;
	font-weight: 900;
	color: #fff;
	@include face(#2a3a72, #1d2a58, #16203f);
	@include raised(#0b1130, 3px, 0.22, 0.3, 0.45, 2.5px);
	text-shadow: 0 2px 0 rgba(6, 9, 30, 0.5);
}

/* ============================================================== МАСКОТ == */
.mascot {
	display: block;
	width: 104px;
	height: auto;
	/*
	   Зазор до строки рекорда.

	   У файла маскота внизу есть собственный воздух — область фильтра тени
	   шире фигуры. Отрицательным отступом я его гасил, и подпись вставала
	   вплотную к ногам куба. Отступ положительный: пустота внутри файла и так
	   невелика, а строке нужно место, чтобы не читаться подписью к картинке.
	*/
	margin: 0 0 10px;
	animation: hop 3.4s var(--soft) infinite;
}

/* Он дышит и чуть подпрыгивает — ровно настолько, чтобы экран не выглядел
   картинкой, и не настолько, чтобы отвлекать от кнопки. */
@keyframes hop {
	0%,
	62%,
	100% {
		transform: translateY(0) scaleY(1);
	}
	70% {
		transform: translateY(2px) scaleY(0.95);
	}
	82% {
		transform: translateY(-9px) scaleY(1.04);
	}
	92% {
		transform: translateY(0) scaleY(0.98);
	}
}

/* =============================================================== РЕКОРД = */
.best {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1px;
	min-height: 46px;
	/* Снизу тоже нужен воздух: у числа толстая обводка и нижняя фаска
	   `0 5px 0`, которые выходят за его бокс, и без отступа оно ложилось прямо
	   на кнопку. */
	margin-bottom: 12px;

	&__value {
		font-size: 34px;
		font-weight: 900;
		line-height: 1.05;
		color: var(--tint);
		text-shadow: -2px -2px 0 #10183a, 2px -2px 0 #10183a, -2px 2px 0 #10183a,
			2px 2px 0 #10183a, 0 5px 0 #080c22;
	}

	&__empty {
		font-size: 11px;
		font-weight: 900;
		letter-spacing: 1.8px;
		text-transform: uppercase;
	}
}

/* =============================================================== КНОПКИ = */
.big {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	width: 100%;
	border: none;
	cursor: pointer;
	overflow: hidden;
	flex: 0 0 auto;
	transition: transform 130ms var(--soft), filter 130ms var(--soft);

	/* Значок в круглой плашке, а не иконка рядом с текстом: на референсе это
	     единственная деталь, которая делает кнопку кнопкой игры, а не строкой
	     меню. */
	&__mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		flex: 0 0 32px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.14);
		color: #b47600;

		&--dim {
			background: rgba(255, 255, 255, 0.22);
			color: #fff;
			box-shadow: none;
		}
	}

	&__label {
		position: relative;
		z-index: 1;
		font-weight: 900;
		letter-spacing: 2.4px;
		text-transform: uppercase;

		&--small {
			font-size: 15px;
			letter-spacing: 1.8px;
		}
	}

	&--play {
		padding: clamp(13px, 2.2vh, 18px) 18px;
		border-radius: 22px;
		color: #4a2c04;
		@include face(#ffdd6e, #f9b83a, #ea9a1c);
		@include raised(#a3660c, 8px, 0.6, 0.18, 0.42, 3px);

		.big__label {
			font-size: clamp(21px, 3.2vh, 25px);
			text-shadow: 0 2px 0 rgba(255, 255, 255, 0.4);
		}

		/* Блик, проезжающий по кнопке. Геометрию он не трогает, поэтому кнопка
		   остаётся «неподвижной» и для глаза, и для автотеста. */
		&::after {
			content: '';
			position: absolute;
			inset: 0 auto 0 -60%;
			width: 45%;
			background: linear-gradient(104deg, transparent, rgba(255, 255, 255, 0.36), transparent);
			animation: shine 3.6s var(--soft) infinite;
		}

		&:active {
			@include press(8px);
		}
	}

	&--settings {
		/*
		   Тридцать два, а не десять.

		   Считать приходится от того, что кнопка занимает на экране, а не от её
		   box: у «Играть» ниже box выступают губа (8px) и обводка (3px), у
		   «Настроек» обводка на те же 3px выше. При десяти пикселях кнопки не
		   расходились вовсе, а перекрывались на четыре.
		   
		   Оставшихся 19 — это видимый зазор, и он нарочно велик. Приходится он
		   ровно на верхушки кустов, и десяти пикселей тёмной зелени между двумя
		   тёмно-синими обводками не видно: всё вместе читается одной полосой.
		   Зазор должен быть шире занятого фона, иначе его нет.
		*/
		margin-top: 32px;
		padding: 11px 18px;
		border-radius: 18px;
		color: #fff;
		@include face(#9280f7, #7b62e8, #6246d6);
		@include raised(#3f2ba0, 6px, 0.5, 0.2, 0.42, 2.5px);

		.big__label {
			text-shadow: 0 2px 0 rgba(10, 14, 45, 0.4);
		}

		&:active {
			@include press(6px);
		}
	}
}

@keyframes shine {
	0%,
	62% {
		transform: translateX(0);
	}
	100% {
		transform: translateX(370%);
	}
}

/* ============================================================== ПОДВАЛ == */
/* Подписи на небе, а не на панели: глобальные `--text-faint`/`--text-dim`
   рассчитаны на тёмный HUD и на светлом дне пропадают совсем. */
.start .cap,
.start .best__empty,
.start .totals,
.start .link {
	color: #fff;
	text-shadow: 0 2px 0 rgba(10, 30, 60, 0.5), 0 2px 8px rgba(5, 20, 40, 0.5);
}

.link {
	display: flex;
	align-items: center;
	gap: 6px;
	background: transparent;
	border: none;
	padding: 5px 8px;
	font-size: 13px;
	font-weight: 900;
	text-decoration: none;
	cursor: pointer;

	&--quiet {
		font-size: 11px;
		font-weight: 800;
	}
}

.totals {
	font-size: 11px;
	font-weight: 800;
}

/* Тихо настолько, что игрок не прочтёт, и разборчиво настолько, что можно
   сфотографировать. */
.build {
	font-size: 9px;
	font-weight: 700;
	letter-spacing: 0.8px;
	color: rgba(255, 255, 255, 0.6);
	text-shadow: 0 1px 3px rgba(5, 20, 40, 0.6);
}

/* Невысокий экран: маскот и рекорд отдают высоту кнопкам. */
@media (max-height: 720px) {
	.mascot {
		width: 84px;
		margin-bottom: 6px;
	}

	.best {
		min-height: 42px;
		margin-bottom: 8px;

		&__value {
			font-size: 27px;
		}
	}

	/*
	   Кнопка ужимается, но не подъезжает вплотную.

	   Здесь стояло `margin-top: 8px`, и на невысоком экране кнопки не просто
	   смыкались, а перекрывались на пять пикселей: восьми не хватало даже на
	   губу с обводкой. Экономить высоту надо на самой кнопке — на это и есть
	   `padding`, — а не на зазоре, которого от этого просто не остаётся.
	   14 на выступы + 10 видимых = 24.
	*/
	.big--settings {
		margin-top: 24px;
		padding: 9px 18px;
	}
}

/* Вход в «Другие игры» стоит в том же ряду, что ссылка на политику, и выглядит
   так же: это служебная ссылка, а не действие. Кнопка, а не <a>, потому что
   ведёт внутрь приложения — уход в Play возможен только через гейт. */
button.link {
	padding: 0;
	border: none;
	background: none;
	font: inherit;
	cursor: pointer;
}
</style>
