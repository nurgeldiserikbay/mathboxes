<script lang="ts" setup>
import { onMounted } from 'vue'

import RatioResize from '@/components/RatioResize.vue'
import ClockItem from '@/components/ClockItem.vue'

import StartPage from '@/pages/StartPage.vue'
import BookFile from '@/pages/BookFile.vue'

import Admob from '@/utils/admob'

const WIDTH = 480
const HEIGHT = 720

onMounted(() => {
	if (import.meta.env.VITE_APP_MODE !== 'TEST') Admob.initialize()
})
</script>

<template>
	<RatioResize :width="WIDTH" :height="HEIGHT">
		<div class="wrapper">
			<div class="clock-wrap">
				<ClockItem />
			</div>
			<img src="@/assets/img/home-flower.png" alt="" class="flower" />
			<img src="@/assets/img/ball.png" alt="" class="ball" />
			<div class="floor"></div>
			<StartPage />
			<BookFile />
		</div>
	</RatioResize>
</template>

<style lang="scss" scoped>
.wrapper {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgb(253, 252, 141);
	background: radial-gradient(
		circle,
		rgba(253, 252, 141, 1) 23%,
		rgba(239, 225, 117, 1) 76%
	);
	box-shadow: 0 0 45px 5px rgba(0, 0, 0, 0.5);

	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: url('@/assets/img/output-onlinepngtools.png') repeat;
		background-size: 10% 10%;
		opacity: 0.2;
	}
}

.flower {
	position: absolute;
	width: 105px;
	right: 50px;
	top: 30px;
}

.ball {
	position: absolute;
	width: 75px;
	left: 30px;
	bottom: 85px;
	z-index: 1;
	border-radius: 50%;
	box-shadow: 3px 6px 5px 0 rgba(0, 0, 0, 0.2);
}

.floor {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 21.5%;
	background: url('@/assets/img/floor.png') repeat;
	background-size: 100% 100%;
}

.clock-wrap {
	position: absolute;
	top: 10px;
	left: 55px;
	z-index: 1;
	border: 5px solid #020202;
	border-radius: 50%;
}
</style>
