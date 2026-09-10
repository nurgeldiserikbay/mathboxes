import { ref, watch } from 'vue'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * `.m4r` is Apple's *ringtone* extension. The files are plain M4A — the header
 * says `ftypM4A` — but served under that name most static hosts send no audio
 * content type at all (GitHub Pages, which is where the PWA lives, answers
 * `application/octet-stream`). Chrome sniffs its way out of it; not every
 * WebView does, and a silent game is a hard bug to spot in review.
 */
export const audioList: { [key: string]: string } = {
	click: '/sounds/click.m4a',
	correct: '/sounds/correct.m4a',
	error: '/sounds/error.m4a',
	result: '/sounds/result.mp3',
	jump: '/sounds/jump.mp3',
	/**
	 * Сердцебиение у самой воды. Не событие, а состояние: играется петлёй, пока
	 * запас мал, и ускоряется по мере того, как вода подходит.
	 */
	danger: '/sounds/heartbreak.mp3',
	/**
	 * Похвала за серию.
	 *
	 * Пока это тот же сэмпл, что и верный ответ, но своим ключом — а значит
	 * своим элементом, который может звучать одновременно с ним. Играется на
	 * высокой ставке, поверх обычного ответа: получается второй, звонкий тон, и
	 * достижение слышно, а не только видно.
	 *
	 * Отдельный ключ здесь именно затем, чтобы заменить это на настоящий файл
	 * можно было одной строкой, ничего больше не трогая.
	 */
	praise: '/sounds/correct.m4a',
}

export interface I_HoldOptions {
	/** Скорость, она же высота: `preservesPitch` выключен. */
	rate?: number
	/** Громкость, 0…1. Долгий звук должен быть тише коротких. */
	volume?: number
}

export interface I_PlayOptions {
	/**
	 * Playback rate, which here is pitch: `preservesPitch` is turned off, so a
	 * rate above 1 plays the same sample higher. It is how the streak gets a
	 * voice without a second sound file.
	 */
	rate?: number
	/** Cut the sample off after this long. */
	maxMs?: number
}

const SOUND_KEY = 'soundEnabled'
const VIBRO_KEY = 'vibroEnabled'

/** Что игра умеет говорить пальцу. Имён ровно столько, сколько разных
 *  событий игрок должен различать не глядя на экран. */
export type TYPE_HAPTIC = 'tap' | 'land' | 'checkpoint' | 'life' | 'miss' | 'timeout'

interface I_Haptic {
	impact: ImpactStyle
	/** Уведомление вместо удара — для событий, у которых есть исход. */
	notify?: NotificationType
	/** Паттерн для веба, где остался только старый API. */
	web: number | number[]
}

const HAPTICS: { [key in TYPE_HAPTIC]: I_Haptic } = {
	tap: { impact: ImpactStyle.Light, web: 12 },
	land: { impact: ImpactStyle.Light, web: 14 },
	checkpoint: { impact: ImpactStyle.Medium, notify: NotificationType.Success, web: [10, 30, 18] },
	life: { impact: ImpactStyle.Medium, notify: NotificationType.Success, web: [12, 26, 20] },
	miss: { impact: ImpactStyle.Heavy, notify: NotificationType.Error, web: [24, 50, 24] },
	timeout: { impact: ImpactStyle.Heavy, notify: NotificationType.Warning, web: [40, 60, 40] },
}

const audioActive = ref(true)
const vibroActive = ref(true)
let settingsLoaded = false

/**
 * One reusable element per sound. Creating `new Audio()` on every tap made the
 * first play of each answer lag on Android, because the file was re-fetched and
 * re-decoded each time.
 */
const players: { [key: string]: HTMLAudioElement } = {}

/** Timers that stop a sample early, one per sound. */
const stoppers: { [key: string]: ReturnType<typeof setTimeout> } = {}

function player(type: string): HTMLAudioElement | null {
	if (!audioList[type]) return null
	if (!players[type]) {
		const element = new Audio(audioList[type])
		element.preload = 'auto'
		// Pitch has to follow the rate — the whole point of changing it here is
		// that the note goes up with the combo.
		const tunable = element as HTMLAudioElement & {
			preservesPitch?: boolean
			mozPreservesPitch?: boolean
			webkitPreservesPitch?: boolean
		}
		tunable.preservesPitch = false
		tunable.mozPreservesPitch = false
		tunable.webkitPreservesPitch = false
		players[type] = element
	}
	return players[type]
}

export function preloadAudio() {
	for (const type of Object.keys(audioList)) {
		const element = player(type)
		try {
			element?.load()
		} catch {
			// A blocked preload is harmless: the sound still plays on demand.
		}
	}
}

export const useAudio = () => {
	async function loadSettings() {
		if (settingsLoaded) return
		settingsLoaded = true

		const [sound, vibro] = await Promise.all([
			Preferences.get({ key: SOUND_KEY }),
			Preferences.get({ key: VIBRO_KEY }),
		])

		if (sound.value !== null) audioActive.value = sound.value === '1'
		if (vibro.value !== null) vibroActive.value = vibro.value === '1'
	}

	function playAudio(audioType: string, options: I_PlayOptions = {}) {
		if (!audioActive.value) return

		const element = player(audioType)
		if (!element) return

		if (stoppers[audioType]) clearTimeout(stoppers[audioType])

		try {
			element.playbackRate = Math.min(4, Math.max(0.25, options.rate ?? 1))
			element.currentTime = 0
			// Autoplay can reject before the first user gesture; that is expected.
			void element.play().catch(() => {})

			if (options.maxMs) {
				stoppers[audioType] = setTimeout(() => {
					element.pause()
					delete stoppers[audioType]
				}, options.maxMs)
			}
		} catch {
			// ignore
		}
	}

	/**
	 * Долгий звук, который живёт состоянием, а не событием.
	 *
	 * Короткие сэмплы играются от случая: нажал — прозвучало. Сердцебиение так
	 * работать не может: оно должно идти, пока опасность есть, и кончаться,
	 * когда её нет. Поэтому здесь не «играй», а «должно ли звучать» — вызывать
	 * можно сколько угодно раз подряд, лишнего не случится.
	 */
	function holdAudio(audioType: string, on: boolean, options: I_HoldOptions = {}) {
		const element = player(audioType)
		if (!element) return

		element.loop = true
		if (options.rate !== undefined) {
			element.playbackRate = Math.min(4, Math.max(0.25, options.rate))
		}
		if (options.volume !== undefined) {
			element.volume = Math.min(1, Math.max(0, options.volume))
		}

		if (on && audioActive.value) {
			if (element.paused) void element.play().catch(() => {})
			return
		}

		if (!element.paused) {
			element.pause()
			element.currentTime = 0
		}
	}

	/** Остановить все петли. Нужно на выходе с доски и на выключении звука. */
	function holdSilence() {
		for (const element of Object.values(players)) {
			if (!element.loop || element.paused) continue
			element.pause()
			element.currentTime = 0
		}
	}

	/**
	 * Haptics, by intent rather than by milliseconds.
	 *
	 * This used to call `navigator.vibrate` with a pattern, which meant the game
	 * never buzzed at all on a real device: the Vibration API needs
	 * `android.permission.VIBRATE`, which the app did not hold, and WKWebView has
	 * no implementation of it whatsoever. The native plugin holds the permission
	 * itself and works on both platforms.
	 *
	 * The argument is a name, not a duration, because the native API does not
	 * take patterns — it takes an intent and decides how that should feel on the
	 * device it is running on. Passing `[24, 50, 24]` to it would mean nothing.
	 * The millisecond patterns survive only in the web fallback, where the PWA
	 * still has the old API to talk to.
	 */
	function vibrate(intent: TYPE_HAPTIC) {
		if (!vibroActive.value) return

		if (Capacitor.isNativePlatform()) {
			const shape = HAPTICS[intent]
			// `.catch`, не try/catch: вызов возвращает промис и отказ у него
			// асинхронный — на устройстве без вибромотора или в сборке, куда
			// плагин не попал, это уходило в необработанное отклонение.
			const call = shape.notify
				? Haptics.notification({ type: shape.notify })
				: Haptics.impact({ style: shape.impact })
			void Promise.resolve(call).catch(() => {})
			return
		}

		try {
			navigator.vibrate?.(HAPTICS[intent].web)
		} catch {
			// ignore
		}
	}

	function toggleAudio() {
		audioActive.value = !audioActive.value
	}

	function toggleVibro() {
		vibroActive.value = !vibroActive.value
	}

	return {
		audioActive,
		vibroActive,
		toggleAudio,
		toggleVibro,
		playAudio,
		holdAudio,
		holdSilence,
		vibrate,
		loadSettings,
		preloadAudio,
	}
}

watch(audioActive, (value) => {
	void Preferences.set({ key: SOUND_KEY, value: value ? '1' : '0' })
	// Короткие сэмплы просто не начнутся, а петля уже играет — её надо
	// остановить руками, иначе выключенный звук продолжает звучать.
	if (!value) {
		for (const element of Object.values(players)) {
			if (element.loop && !element.paused) {
				element.pause()
				element.currentTime = 0
			}
		}
	}
})

watch(vibroActive, (value) => {
	void Preferences.set({ key: VIBRO_KEY, value: value ? '1' : '0' })
})
