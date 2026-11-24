import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'


import de from './langs/de'
import en from './langs/en'
import es from './langs/es'
import fr from './langs/fr'
import kk from './langs/kk'
import ru from './langs/ru'

import './style.scss'

import { watchScale } from './utils/scale'

import App from './App.vue'

const i18n = createI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: {
		de,
		en,
		es,
		fr,
		kk,
		ru,
	},
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// Масштаб ставится до монтирования: иначе первый кадр успевает лечь
// телефонной вёрсткой в угол планшета, и это видно как рывок.
watchScale()

const app = createApp(App)

app.use(i18n)
app.use(pinia)

app.mount('#app')

/**
 * The service worker belongs to the PWA and to nothing else.
 *
 * Inside the Android app every file is already on the device, so a worker adds
 * no offline support — only a second copy of the app that answers first. And
 * because Capacitor serves the app from a secure origin, it does
 * install there; because Cache Storage survives an app update, it then keeps
 * serving the build it cached before. That is the whole of the "I installed a
 * new APK and the old version opened" bug: the worker replied out of its cache
 * before anything in the new package was read.
 *
 * On the web it is registered by hand, since `injectRegister` is off.
 * On a device the opposite is done — any worker left over from a build that had
 * this problem is unregistered and its caches deleted, so an install that is
 * already stuck heals itself instead of staying stuck.
 */
async function manageServiceWorker() {
	if (!('serviceWorker' in navigator)) return

	if (!Capacitor.isNativePlatform()) {
		try {
			await navigator.serviceWorker.register('./sw.js', { scope: './' })
		} catch {
			// A PWA that could not register its worker is still a working game.
		}
		return
	}

	try {
		const registrations = await navigator.serviceWorker.getRegistrations()
		await Promise.all(registrations.map((registration) => registration.unregister()))

		if ('caches' in window) {
			const keys = await caches.keys()
			await Promise.all(keys.map((key) => caches.delete(key)))
		}
	} catch {
		// Nothing here is load-bearing: if the clean-up fails the game still runs,
		// it just runs from the cache one more time.
	}
}

window.addEventListener('load', () => void manageServiceWorker())
