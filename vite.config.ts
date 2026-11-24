import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
import { VitePWA } from 'vite-plugin-pwa'

const START_PATH = '.'
const SCOPE = 'https://nurgeldiserikbay.github.io/'
const START_URL = './index.html?fullscreen=true'

const VitePWAConf = {
	// The registration script is NOT injected into index.html. The same build is
	// shipped two ways — as a PWA on GitHub Pages and as the web layer inside the
	// Android APK — and a service worker is right for exactly one of them.
	//
	// Capacitor serves the app from `https://localhost`, which is a secure origin,
	// so the worker installed there quite happily and precached index.html behind
	// a NavigationRoute. Cache Storage in the WebView survives an app update, so
	// the next launch after installing a new build was answered out of the old
	// cache: new files in the APK, old game on screen, correcting itself only on
	// the second launch once the worker had swapped itself out.
	//
	// So registration is done by hand in `main.ts`, where it can ask what it is
	// running on. See the note there.
	injectRegister: null,
	registerType: 'autoUpdate',
	workbox: {
		// Audio is in the list because a PWA opened offline with no sounds is a
		// game that feels broken rather than a game that is quiet. All four files
		// together are about a hundred kilobytes.
		globPatterns: ['**/*.{js,css,html,ico,png,svg,json,txt,m4a,mp3}'],
		// Install-prompt screenshots and launcher icons are fetched by the browser
		// or the OS when they are needed. Precaching them made the service worker
		// pull 2.2 MB before the first game.
		globIgnores: ['**/screenshots/**', '**/icons/**'],
	},
	manifest: {
		id: 'com.thelightcome.mathboxes',
		name: 'Math Boxes',
		short_name: 'Math Boxes',
		description:
			'Mental math with a climb. An equation appears, you pick the answer, and your cube hops onto that block — while the water keeps rising below. Add, subtract, multiply, divide; twelve steps of difficulty that follow how you answer, not how long you have played. Six places to climb, no timer, no lives, no sign-up. Works offline.',
		scope: SCOPE,
		start_url: START_URL,
		display: 'fullscreen',
		orientation: 'portrait',
		background_color: '#100c24',
		lang: 'en',
		theme_color: '#100c24',
		protocol_handlers: [],
		icons: [
			{
				src: START_PATH + '/icons/favicon-16x16.png',
				type: 'image/png',
				sizes: '16x16',
			},
			{
				src: START_PATH + '/icons/favicon-32x32.png',
				type: 'image/png',
				sizes: '32x32',
			},
			{
				src: START_PATH + '/icons/android-chrome-192x192.png',
				type: 'image/png',
				sizes: '192x192',
			},
			{
				src: START_PATH + '/icons/android-chrome-512x512.webp',
				type: 'image/webp',
				sizes: '512x512',
			},
			{
				src: START_PATH + '/icons/apple-touch-icon.png',
				type: 'image/png',
				sizes: '180x180',
			},
		],
		display_override: ['window-controls-overlay'],
		// Кадры для окна установки. Собираются `_docs/store/make-brand.mjs` из тех
		// же снимков, что уходят в Play, и в том же соотношении 9:16.
		//
		// Широких кадров здесь нет намеренно: игра заблокирована в портрете, и
		// лежащие на боку скриншоты показывали бы то, чего на устройстве не бывает.
		screenshots: [1, 2, 3, 4, 5].map((n) => ({
			src: `${START_PATH}/screenshots/narrow-${n}.webp`,
			type: 'image/webp',
			sizes: '405x720',
			form_factor: 'narrow' as const,
		})),
	},
}

// https://vitejs.dev/config/
/**
 * When this bundle was built, stamped into the app itself.
 *
 * "I built it and the old version opened" has cost this project several rounds
 * of guessing, and every one of them would have been a two-second glance if the
 * game had said which build it was. It is on the start screen, small enough to
 * be furniture and precise enough to settle the question.
 */
const BUILD_STAMP = new Date()
	.toLocaleString('sv-SE', { hour12: false })
	.slice(5, 16)
	.replace('-', '.')

export default defineConfig({
	base: './',
	define: {
		__BUILD_ID__: JSON.stringify(BUILD_STAMP),
	},
	build: {
		outDir: './docs',
	},
	plugins: [
		vue(),
		// `cleanupIds` в SVGO по умолчанию сжимает идентификаторы до `a`, `b`, `c`.
		// В отдельных файлах это безобидно, но иконки инлайнятся в один документ —
		// и градиенты всех иконок превращались в `#a`, после чего первый в DOM
		// перекрашивал остальные: сердца становились золотыми, потому что выше на
		// экране стояла корона. Идентификаторы в файлах уже уникальны по имени.
		svgLoader({
			defaultImport: 'component',
			svgoConfig: {
				plugins: [
					{ name: 'preset-default', params: { overrides: { cleanupIds: false } } },
				],
			},
		}),
		VitePWA(VitePWAConf),
	],
	// Набор миксинов объёма подмешивается в каждый SCSS, включая scoped-блоки
	// компонентов — иначе фаску пришлось бы переписывать в каждом файле.
	css: {
		preprocessorOptions: {
			scss: { additionalData: '@use "@/styles/kit" as *;' },
		},
	},
	resolve: {
		alias: [
			{
				find: '@',
				replacement: path.resolve(__dirname, './src/'),
			},
		],
	},
})
