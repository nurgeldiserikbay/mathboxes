<script lang="ts" setup>
import { onMounted, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'
import { useI18n } from 'vue-i18n'
import { Device } from '@capacitor/device'

import Admob from '@/utils/admob'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'
import { useAdsStore } from '@/store/adsStore'
import { preloadAudio, useAudio } from '@/composables/useAudio'

import { PAGES } from '@/utils/conts'

const pageStore = usePageStore()
const gameStore = useGameStore()
const adsStore = useAdsStore()
const { loadSettings } = useAudio()
const i18n = useI18n()

const isAndroid = Capacitor.getPlatform() === 'android'

/**
 * Boot, step by step, and never let one step take the others down with it.
 *
 * This used to be a straight run of `await`s. A single rejection anywhere in it
 * — a Preferences read on a device with no storage granted, an immersive-mode
 * call on a skin that does not implement it — aborted the whole handler, and
 * because `SplashScreen.hide()` was the last line, the app sat on its splash
 * screen forever. From the outside that is indistinguishable from a crash.
 */
async function step(what: string, run: () => Promise<unknown> | unknown) {
	try {
		await run()
	} catch (error) {
		console.warn(`[boot] ${what}`, error)
	}
}

onMounted(async () => {
	// Нативный слой сообщает, стоит ли в слоте настоящее объявление. Пока не
	// стоит — слот рисует кросс-промо наших игр, а место под него занято всегда.
	Admob.onBannerChange((live, height) => adsStore.setBanner(live, height))
	Admob.onBannerFault((reason) => adsStore.setBannerFault(reason))

	await step('records', () => gameStore.loadData())
	// How many games have passed since the last interstitial. Restored from disk
	// so quitting the app between games is not a way to never see an ad.
	await step('ad gate', () => adsStore.loadGate())
	await step('settings', () => loadSettings())
	await step('locale', () => applyLocale())
	await step('audio', () => preloadAudio())

	if (isAndroid) {
		void Admob.initialize().catch(() => {})

		await step('immersive', () => Fullscreen.activateImmersiveMode())
		await step('status bar', () => StatusBar.hide())
		await step('overlay', () => StatusBar.setOverlaysWebView({ overlay: true }))
	}

	// Last, unconditionally, and after everything that could have failed: the
	// splash has to come down even if nothing else worked.
	await step('splash', () => SplashScreen.hide())
})

/**
 * The banner belongs to the screen, not to the run.
 *
 * It used to be shown and removed by the board itself, in `onMounted` and
 * `onBeforeUnmount`. But "play again" remounts the board, so every replay tore
 * the ad view down and built a new one in the same tick — an unawaited destroy
 * racing a create, on the UI thread, which is a good way to take the process
 * with it. It also meant a fresh ad request every single game and a 56 px jump
 * in the layout each time.
 *
 * Watching the page instead means a replay does not touch the banner at all:
 * the page is still `PLAYGROUND` before and after.
 */
watch(
	() => pageStore.currentPage,
	(page) => {
		if (!isAndroid) return
		// Ошибку здесь раньше глотали молча, и «баннера нет» выглядело одинаково
		// при отсутствии спроса и при сломанном вызове. Разницу видно только так.
		if (page === PAGES.PLAYGROUND) {
			void Admob.showBanner().catch((error) => console.warn('[admob] showBanner', error))
		} else {
			void Admob.removeBanner().catch((error) => console.warn('[admob] removeBanner', error))
		}
	}
)

/** A language picked by hand wins; otherwise fall back to the device locale. */
async function applyLocale() {
	const saved = gameStore.locale
	if (saved && i18n.availableLocales.includes(saved)) {
		i18n.locale.value = saved
		return
	}

	try {
		const info = await Device.getLanguageCode()
		const detected = i18n.availableLocales.find((lang) => lang === info.value)
		if (detected) i18n.locale.value = detected
	} catch {
		// Keep the default locale when the device cannot report one.
	}
}
</script>

<template>
	<div class="wrapper">
		<component :is="pageStore.currentPageComponent" :key="pageStore.viewKey" />
	</div>
</template>

<style lang="scss" scoped>
.wrapper {
	width: 100%;
	min-height: var(--vh);
}
</style>
