<script lang="ts" setup>
/**
 * The wordmark.
 *
 * One file — `assets/logo/math-boxes.svg` — so it can be replaced by a drawn
 * export without touching this component. The letters inside it are real
 * `<text>` nodes rather than outlines: the file is inlined into the document,
 * so the page's own font applies and the logo stays editable text.
 *
 * The only thing added here is the breathing: four blocks that never move read
 * as a picture of the game, and four that drift slightly read as the game
 * waiting for you.
 */
import Wordmark from '@/assets/logo/math-boxes.svg?component'
</script>

<template>
	<div class="logo">
		<i class="logo__glow" aria-hidden="true" />
		<Wordmark class="logo__mark" role="img" aria-label="Math Boxes" />
	</div>
</template>

<style lang="scss" scoped>
.logo {
	position: relative;
	display: flex;
	justify-content: center;

	&__mark {
		position: relative;
		z-index: 1;
		width: min(360px, 96%);
		height: auto;
		animation: breathe 4.6s var(--soft) infinite;
	}

	/* Тёплая засветка позади надписи. Тень у логотипа своя, в самом файле, а
	   это — свет: без него экструдированные буквы на светлом небе выглядят
	   вырезанными из него, а не стоящими перед ним. */
	&__glow {
		position: absolute;
		left: 50%;
		top: 52%;
		width: 320px;
		height: 170px;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		background: radial-gradient(
			52% 52% at 50% 50%,
			rgba(255, 255, 255, 0.5),
			transparent 74%
		);
		filter: blur(14px);
	}
}

@keyframes breathe {
	0%,
	100% {
		transform: translateY(0) rotate(0deg);
	}
	50% {
		transform: translateY(-5px) rotate(-0.6deg);
	}
}
</style>
