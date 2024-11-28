import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createI18n } from 'vue-i18n'

import '@limonische/vue3-transition-expand/dist/style.css'

import de from './langs/de'
import en from './langs/en'
import es from './langs/es'
import fr from './langs/fr'
import kk from './langs/kk'
import ru from './langs/ru'

import './style.scss'

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

const app = createApp(App)

app.use(i18n)
app.use(pinia)

app.mount('#app')
