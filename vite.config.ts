import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
import { VitePWA } from 'vite-plugin-pwa'

const START_PATH = '.'
const SCOPE = 'https://nurgeldiserikbay.github.io/'
const START_URL = './index.html?fullscreen=true'

const VitePWAConf = {
	injectRegister: 'auto',
	registerType: 'autoUpdate',
	workbox: {
		globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
	},
	manifest: {
		id: 'com.thelightcome.mathboxes',
		name: 'Math Boxes',
		short_name: 'Math Boxes',
		description:
			"Solve exciting equations with missing numbers, choose the correct answer from four options, and earn points! The game features 8 levels, each focusing on a unique mathematical operation: addition, subtraction, multiplication, division, exponentiation, square root, logarithm, and a random mix of all operations. \n Test your skills, beat the timer, and prove you're a math master!",
		scope: SCOPE,
		start_url: START_URL,
		display: 'fullscreen',
		orientation: 'portrait',
		background_color: '#fff',
		lang: 'en',
		theme_color: '#fff',
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
				src: START_PATH + '/icons/mstile-70x70.png',
				type: 'image/png',
				sizes: '128x128',
			},
			{
				src: START_PATH + '/icons/mstile-144x144.png',
				type: 'image/png',
				sizes: '144x144',
			},
			{
				src: START_PATH + '/icons/mstile-150x150.png',
				type: 'image/png',
				sizes: '270x270',
			},
			{
				src: START_PATH + '/icons/mstile-310x150.png',
				type: 'image/png',
				sizes: '558x270',
			},
			{
				src: START_PATH + '/icons/mstile-310x310.png',
				type: 'image/png',
				sizes: '558x558',
			},
			{
				src: START_PATH + '/icons/android-chrome-192x192.png',
				type: 'image/png',
				sizes: '192x192',
			},
			{
				src: START_PATH + '/icons/android-chrome-512x512.png',
				type: 'image/png',
				sizes: '512x512',
			},
			{
				src: START_PATH + '/icons/apple-touch-icon.png',
				type: 'image/png',
				sizes: '180x180',
			},
		],
		display_override: ['window-controls-overlay'],
		screenshots: [
			{
				src: START_PATH + '/screenshots/narrow-1.png',
				type: 'image/png',
				sizes: '406x720',
				form_factor: 'narrow',
			},
			{
				src: START_PATH + '/screenshots/narrow-2.png',
				type: 'image/png',
				sizes: '406x720',
				form_factor: 'narrow',
			},
			{
				src: START_PATH + '/screenshots/narrow-3.png',
				type: 'image/png',
				sizes: '406x720',
				form_factor: 'narrow',
			},
			{
				src: START_PATH + '/screenshots/narrow-4.png',
				type: 'image/png',
				sizes: '406x720',
				form_factor: 'narrow',
			},
			{
				src: START_PATH + '/screenshots/narrow-5.png',
				type: 'image/png',
				sizes: '406x720',
				form_factor: 'narrow',
			},
			{
				src: START_PATH + '/screenshots/narrow-6.png',
				type: 'image/png',
				sizes: '406x720',
				form_factor: 'narrow',
			},
			{
				src: START_PATH + '/screenshots/wide-1.png',
				type: 'image/png',
				sizes: '1024x640',
				form_factor: 'wide',
			},
			{
				src: START_PATH + '/screenshots/wide-2.png',
				type: 'image/png',
				sizes: '1024x640',
				form_factor: 'wide',
			},
			{
				src: START_PATH + '/screenshots/wide-3.png',
				type: 'image/png',
				sizes: '1024x640',
				form_factor: 'wide',
			},
			{
				src: START_PATH + '/screenshots/wide-4.png',
				type: 'image/png',
				sizes: '1024x601',
				form_factor: 'wide',
			},
			{
				src: START_PATH + '/screenshots/wide-5.png',
				type: 'image/png',
				sizes: '1024x601',
				form_factor: 'wide',
			},
			{
				src: START_PATH + '/screenshots/wide-6.png',
				type: 'image/png',
				sizes: '1024x601',
				form_factor: 'wide',
			},
		],
	},
}

// https://vitejs.dev/config/
export default defineConfig({
	base: './',
	build: {
		outDir: './docs',
	},
	plugins: [vue(), svgLoader(), VitePWA(VitePWAConf)],
	resolve: {
		alias: [
			{
				find: '@',
				replacement: path.resolve(__dirname, './src/'),
			},
		],
	},
})
