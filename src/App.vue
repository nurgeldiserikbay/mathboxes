<script lang="ts" setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'
import { useI18n } from 'vue-i18n'
import { Device } from '@capacitor/device'

import Admob from '@/utils/admob'

import HeadMain from '@/components/HeadMain.vue'

import { PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

const pageStore = usePageStore()
const gameStore = useGameStore()
const i18n = useI18n()

onMounted(async () => {
	gameStore.loadData()

	if (Capacitor.getPlatform() === 'android') {
		Admob.initialize()
	}

	if (Capacitor.getPlatform() === 'android') {
		await Fullscreen.activateImmersiveMode()
		await StatusBar.hide()
		await StatusBar.setOverlaysWebView({ overlay: true })
		await SplashScreen.hide()
		logDeviceInfo()
	}
})

async function logDeviceInfo() {
	const info = await Device.getLanguageCode()
	const lang = i18n.availableLocales.find((lang) => lang === info.value)

	if (lang) i18n.locale.value = lang
}
</script>

<template>
	<div class="wrapper">
		<HeadMain v-if="pageStore.currentPage === PAGES.START" />
		<component :is="pageStore.currentPageComponent" />
	</div>
</template>

<style lang="scss" scoped>
.wrapper {
	width: 100%;
	min-height: 100dvh;
}
</style>
