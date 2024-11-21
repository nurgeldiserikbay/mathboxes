<script lang="ts" setup>
import { computed } from 'vue'

import { LEVELS } from '@/utils/conts'

import { useGameStore } from '@/store/gameStore'

const gameStore = useGameStore()

const isActive = computed(() => (id: number) => {
	const prevlevel = LEVELS.find((l) => l.id === id - 1)

	return !prevlevel || gameStore.gameStats[prevlevel.id]
})
</script>

<template>
	<div class="book-shelf">
		<div class="book-shelf__logo">
			<span>M</span>
			<span>a</span>
			<span>t</span>
			<span>h</span>
			<span> </span>
			<span>S</span>
			<span>h</span>
			<span>e</span>
			<span>l</span>
			<span>f</span>
		</div>
		<div
			v-for="book in LEVELS"
			:key="book.id"
			:style="{ ...book.positions }"
			class="book"
			:class="{ 'book--active': isActive(book.id) }"
			@click="gameStore.setSelectedBookInd(book.id)"
		>
			<div class="book__item">
				<div class="book__cover" :style="{ background: book.background }">
					<div class="book__signs">
						<span
							v-for="sign in book.mainsign.length
								? book.mainsign
								: book.signs.slice(0, 3)"
							:key="sign"
						>
							{{ sign }}
						</span>
					</div>
					<div class="book__label">{{ book.title }}</div>
				</div>
			</div>
			<div class="book__mask"></div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.book-shelf {
	position: relative;
	background: url('@/assets/img/shelf.png') 100% no-repeat;
	background-size: 100%;
	width: 400px;
	height: 540px;
	perspective: 500px;

	&__logo {
		position: absolute;
		bottom: 493px;
		left: 20px;
		font-size: 38px;
		line-height: 1;
		letter-spacing: 8px;
		-webkit-text-stroke: 2px rgb(50, 50, 109);

		span {
			&:nth-child(1) {
				color: #fea095;
			}
			&:nth-child(2) {
				color: #9ce8e0;
			}
			&:nth-child(3) {
				color: #ffb3ab;
			}
			&:nth-child(4) {
				color: #a6f2bc;
			}
			&:nth-child(5) {
				color: #a3dfff;
			}
			&:nth-child(6) {
				color: #dab0ff;
			}
			&:nth-child(7) {
				color: #ffbdae;
			}
			&:nth-child(8) {
				color: #9ce8e0;
			}
			&:nth-child(9) {
				color: #ffb3ab;
			}
			&:nth-child(10) {
				color: #a3dfff;
			}
		}
	}
}

.book {
	position: absolute;
	width: 70px;
	height: 90px;
	cursor: pointer;
	// pointer-events: none;

	&--active {
		opacity: 1;
		pointer-events: unset;
	}

	&__item {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: #ffffff;
		transform-style: preserve-3d;
		transition: 0.4s linear;
		// opacity: 0.5;
	}

	&--active &__item {
		opacity: 1;
	}

	&:hover &__item {
		transform: translate(-5px, -5px) rotateX(20deg) rotateY(-10deg);
	}

	&__cover {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: #dd21ce;
		transition: 0.4s linear;
		transform-style: preserve-3d;
		transform-origin: 0% 50%;
		display: flex;
		justify-content: center;
		text-align: center;
		padding-top: 15px;
		box-sizing: border-box;
		overflow: hidden;
	}

	&:hover &__cover {
		transform: rotateY(-25deg);
	}

	&__signs {
		position: relative;
		width: 25px;
		height: 25px;
		padding: 5px;
		background: #ffffff;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		font-size: 14px;
		font-weight: 400;
		border: 2px solid #020202;
		box-shadow: 0 5px 25px 0 rgba(255, 255, 255, 0.6);
		backface-visibility: hidden;
	}

	&__label {
		font-family: 'LuckiestGuy', sans-serif;
		font-size: 10px;
		font-weight: 400;
		position: absolute;
		left: 50%;
		bottom: 25px;
		transform-origin: center;
		transform: rotateZ(-15deg) translate(-50%, 25%);
		color: #1e1c1b;
	}
}
</style>
