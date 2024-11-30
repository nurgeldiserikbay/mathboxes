<script lang="ts" setup>
import { computed } from 'vue'

const $props = withDefaults(
	defineProps<{
		size?: number | string
		bgcolor?: string
		show: boolean
		value: string
		animateClass: string
	}>(),
	{
		size: '48px',
		bgcolor: '#0f2741',
	}
)

const halfWidth = computed(() => `${parseInt(String($props.size)) / 2}px`)
const halfWidthMin = computed(
	() => `${(-1 * parseInt(String($props.size))) / 2}px`
)
const getValue = computed(() => {
	return $props.show ? $props.value : '?'
})

const getFontSize = computed(() => {
	if ($props.value.length > 5) return '12px'
	else if ($props.value.length > 4) return '14px'
	else if ($props.value.length > 3) return '16px'
	else if ($props.value.length > 2) return '18px'
	else if ($props.value.length > 1) return '20px'
	return '22px'
})
</script>

<template>
	<div class="cube-wrapper" :class="{ [animateClass]: true }">
		<div
			class="cube"
			:style="{ fontSize: getFontSize }"
		>
			<div class="cube__side cube__side--top">
				<div class="value">{{ getValue }}</div>
				<div class="before"></div>
				<div class="after"></div>
			</div>
			<div class="cube__side cube__side--front">
				<div class="before"></div>
				<div class="after"></div>
			</div>
			<div class="cube__side cube__side--right">
				<div class="value">{{ getValue }}</div>
				<div class="before"></div>
				<div class="after"></div>
			</div>
			<div class="cube__side cube__side--left">
				<div class="value">{{ getValue }}</div>
				<div class="before"></div>
				<div class="after"></div>
			</div>
			<div class="cube__side cube__side--bottom">
				<div class="value">{{ getValue }}</div>
				<div class="before"></div>
				<div class="after"></div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
$animation-duration: 9000ms;

.cube-wrapper {
	transform-style: preserve-3d;
	cursor: pointer;
}

.cube {
	position: relative;
	width: v-bind(size);
	height: v-bind(size);
	transform-style: preserve-3d;
	// animation-name: move;
	transform: translateY(-50%) rotateX(83deg) rotateZ(0deg);
	animation-timing-function: linear;
}

.rotate .cube {
	animation: rotate 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.shaking {
	animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.cube__side {
	position: absolute;
	top: 0;
	left: 0;
	transform-style: preserve-3d;
	border-radius: 3px;
	width: v-bind(size);
	height: v-bind(size);
	background: v-bind(bgcolor);
	border: 1px solid #f5f5f5;

	.before,
	.after {
		content: '';
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 1px;
	}

	.before {
		position: absolute;
		transform: scale(0.99) translateZ(-1px);
		background: v-bind(bgcolor);
	}
}

.value {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	font-weight: 800;
	color: #020202;
}

@keyframes rotate {
	0% {
		transform: translateY(-50%) rotateX(83deg) rotateZ(0deg);
	}
	100% {
		transform: translateY(-50%) rotateX(83deg) rotateZ(-360deg);
	}
}

@keyframes shake {
	10%,
	90% {
		transform: translate3d(-1px, 0, 0);
	}

	20%,
	80% {
		transform: translate3d(2px, 0, 0);
	}

	30%,
	50%,
	70% {
		transform: translate3d(-4px, 0, 0);
	}

	40%,
	60% {
		transform: translate3d(4px, 0, 0);
	}
}

.cube__side--top {
	transform: rotateX(-90deg)
		translate3d(0, v-bind(halfWidth), v-bind(halfWidthMin)) scale(-1, 1);
}

.cube__side--right {
	transform: rotateY(90deg) translate3d(v-bind(halfWidth), 0, v-bind(halfWidth))
		rotateZ(-90deg);
}

.cube__side--left {
	transform: rotateY(-90deg)
		translate3d(v-bind(halfWidthMin), 0, v-bind(halfWidth)) rotateZ(90deg);
}

.cube__side--bottom {
	transform: rotateX(90deg)
		translate3d(0, v-bind(halfWidthMin), v-bind(halfWidthMin)) scale(-1, 1)
		rotateZ(180deg);
}

.cube__side--top .before,
.cube__side--bottom .before {
	transform: scale(0.99) translateZ(1px);
}

.cube__side--left .after,
.cube__side--right .after {
	transform: rotate(90deg);
}
</style>
