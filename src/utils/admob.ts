import {
	AdMob,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	AdMobBannerSize,
	BannerAdOptions,
	InterstitialAdPluginEvents,
	AdLoadInfo,
	AdOptions,
	AdMobError,
	MaxAdContentRating,
} from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { StatusBar } from '@capacitor/status-bar'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

// The Play Console target audience of this game includes children, so Families
// policy applies: every ad request must be tagged as child-directed, capped at
// G-rated inventory and non-personalized. An AdMob console setting does not
// replace these flags — dropping them for revenue is what gets an update
// rejected for "ad content not consistent with the app's content rating".
const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	// Mode-based: enable test ads only in dev builds, real ads in production.
	initializeForTesting: import.meta.env.DEV,
	tagForChildDirectedTreatment: true,
	tagForUnderAgeOfConsent: true,
	maxAdContentRating: MaxAdContentRating.General,
}

// Frequency cap: show at most one interstitial per this interval. The caller
// also paces ads by games played (see adsStore); this is the backstop.
const INTERSTITIAL_MIN_INTERVAL_MS = 90 * 1000
let lastInterstitialShownAt = 0

// No interstitial in the first minutes after launch.
const INTERSTITIAL_GRACE_MS = 180 * 1000

// Место под баннер держится всегда, а не появляется вместе с рекламой: иначе
// приход объявления сдвигает вёрстку, а его отсутствие оставляет сверху пустую
// полосу. Это высота резерва — примерно столько занимает адаптивный баннер на
// телефоне; пока настоящая высота неизвестна, слот стоит на ней.
const BANNER_FALLBACK_HEIGHT = 56

// The game must never sit blocked behind an ad: interstitials are preloaded and
// skipped when not ready, and a watchdog covers a Dismissed event that never
// arrives. A frozen screen
// where the ad should be is what "Broken functionality" / "unclosable ads"
// rejections look like from the reviewer's side.
/**
 * С какой версии Android плагин сам отодвигает верхний баннер.
 *
 * В `BannerExecutor` под `Build.VERSION_CODES.VANILLA_ICE_CREAM` (35) висит
 * слушатель инсетов, который для `TOP_CENTER` ставит объявлению верхний отступ
 * в системный инсет. Отключить это из приложения нельзя, и знать о нём вёрстке
 * неоткуда — а объявление при этом встаёт ниже отведённой полосы и накрывает
 * собой HUD.
 *
 * Значит вёрстка должна отодвинуть полосу ровно на столько же. Условие здесь
 * повторяет плагинное намеренно: на Android 14 и ниже отступа нет, и добавить
 * его значило бы промахнуться в другую сторону.
 */
const SAFE_AREA_BANNER_SDK = 35

const DISMISS_WATCHDOG_MS = 25 * 1000

class Admob {
	// Guard so banner event listeners are registered only once (prevents a
	// listener leak: showBanner() runs on every entry to the play screen).
	private bannerListenersRegistered = false

	/**
	 * Whether an ad view is currently up. Every entry point here is idempotent
	 * because of it: showing a banner that is already showing, or removing one
	 * that is not there, are both native view operations on the UI thread, and
	 * a destroy racing a create is a way to take the process down.
	 */
	private bannerVisible = false
	/** A show or remove already in flight. The next call waits for it instead of
	 *  starting a second one alongside. */
	private bannerLock: Promise<void> = Promise.resolve()

	// initialize() is what applies the child-directed request configuration, so
	// no ad may be requested before it has finished — an early request is served
	// from adult-rated inventory. The promise is cached so the ad entry points
	// await the same initialization instead of starting a second one.
	private initPromise: Promise<void> | null = null
	private initialized = false

	// Interstitial state: the preloaded ad and the show currently on screen.
	private readonly startedAt = Date.now()
	private interstitialListenersRegistered = false
	private interstitialReady = false
	private interstitialLoading = false
	private interstitialClosed = true
	private onInterstitialClosed: (() => void) | null = null
	private watchdogID: ReturnType<typeof setTimeout> | undefined
	private barsShownForAd = false

	private get isNative() {
		return Capacitor.isNativePlatform()
	}

	/**
	 * Нативный баннер рисуется поверх вебвью, а не внутри вёрстки, поэтому сама
	 * страница о нём ничего не знает. Через эту переменную она узнаёт высоту
	 * слота и держит под него место.
	 *
	 * `null` — вернуться к значению по умолчанию из `:root`, то есть к резерву.
	 * Место при этом не исчезает: в нём просто снова появляется кросс-промо.
	 */
	private setSlotHeight(px: number | null) {
		if (typeof document === 'undefined') return
		const root = document.documentElement.style
		if (px === null) root.removeProperty('--ad-slot')
		else root.setProperty('--ad-slot', `${Math.max(44, Math.round(px))}px`)
	}

	/**
	 * Отодвигает рекламную полосу туда же, куда система отодвинула баннер.
	 *
	 * Само число не считается здесь и не может: его знает браузер, и отдаёт он
	 * его через `env(safe-area-inset-top)` — то же окно, те же инсеты, что
	 * читает плагин. Переменной присваивается само выражение, а не результат:
	 * инсет меняется вместе с системными панелями, и вычислять его на месте
	 * должен CSS, а не мы один раз при старте.
	 *
	 * Требует `viewport-fit=cover` в `index.html` — без него `env()` всегда
	 * ноль, и вся эта настройка молча ничего не делает.
	 */
	private async applyBannerSafeArea() {
		try {
			const info = await Device.getInfo()
			const sdk = info.androidSDKVersion ?? 0
			this.needsSafeArea = info.platform === 'android' && sdk >= SAFE_AREA_BANNER_SDK
		} catch (error) {
			console.warn('[admob] safe area', error)
		}
	}

	/**
	 * Отодвигает рекламную зону туда же, куда система отодвинула баннер.
	 *
	 * Ставится и снимается вместе с самим объявлением, а не один раз при
	 * старте. Отодвигать нужно под баннер — а когда баннера нет, отодвигать не
	 * подо что: в полосе стоит кросс-промо, и уехавшая вниз полоса оставляла
	 * над собой пустую кромку. Именно это и было видно на устройстве.
	 *
	 * Само число не считается здесь и не может: его знает браузер и отдаёт
	 * через `env(safe-area-inset-top)` — то же окно и те же инсеты, что читает
	 * плагин. Переменной присваивается выражение, а не результат: инсет меняется
	 * вместе с системными панелями, и вычислять его должен CSS.
	 *
	 * Требует `viewport-fit=cover` в `index.html` — без него `env()` всегда ноль.
	 */
	private setSafeArea(on: boolean) {
		if (typeof document === 'undefined') return
		const root = document.documentElement.style
		if (on && this.needsSafeArea) {
			root.setProperty('--ad-top', 'env(safe-area-inset-top, 0px)')
		} else {
			root.removeProperty('--ad-top')
		}
	}

	/** Кому сообщать, стоит ли в слоте настоящее объявление. */
	private bannerListener: ((live: boolean, height: number) => void) | null = null

	/**
	 * Почему баннера нет — последним известным словом плагина.
	 *
	 * Нужно не игре, а нам: «объявления нет» выглядит одинаково при отсутствии
	 * спроса, при неверном блоке и при сломанном вызове, а разница между этими
	 * тремя — это разница между «подождать» и «чинить». Показывается только в
	 * отладочной сборке, см. `AdSlot.vue`.
	 */
	private bannerFault: ((reason: string) => void) | null = null

	onBannerFault(listener: (reason: string) => void) {
		this.bannerFault = listener
	}

	/**
	 * Пришло ли объявление. Ставится только по `Loaded` и снимается только по
	 * отказу или снятию баннера.
	 *
	 * Отдельный флаг нужен потому, что `SizeChanged` о наличии объявления не
	 * говорит ничего. Плагин рассылает его в пяти местах: на загрузке — с
	 * настоящим размером, на отказе, на скрытии и на снятии — с нулями, и на
	 * возобновлении — снова с размером. Раньше обработчик на любой из них
	 * объявлял слот живым, и на снятии баннера слот оставался «живым» с нулевой
	 * высотой: кросс-промо пряталось, а на его месте стояла пустая полоса.
	 * Именно это и видно при возврате на доску — пока новое объявление грузится,
	 * показывать в слоте уже нечего.
	 */
	private bannerLoaded = false

	/** Нужно ли вообще отодвигать полосу: только Android 15 и выше. */
	private needsSafeArea = false

	onBannerChange(listener: (live: boolean, height: number) => void) {
		this.bannerListener = listener
	}

	/** Последняя известная высота объявления. */
	private bannerHeight = 0

	private publish(live: boolean, height = 0) {
		this.bannerListener?.(live, height)
	}

	/** Слот пуст: место остаётся, но в нём снова кросс-промо. */
	private clearBanner() {
		this.bannerLoaded = false
		this.bannerHeight = 0
		this.setSlotHeight(null)
		this.setSafeArea(false)
		this.publish(false)
	}

	// While a full-screen ad is up the system bars must be visible: the ad activity
	// belongs to the Ads SDK and Android 15 renders it edge-to-edge, so with the
	// game's immersive mode active (App.vue activates it on mount) the ad's close
	// button can land under the navigation bar or cutout. Failures here are
	// non-fatal — the ad still shows.
	private async showSystemBars() {
		try {
			await Fullscreen.deactivateImmersiveMode()
			await StatusBar.show()
		} catch (error) {
			console.warn('[admob] system bars', error)
		}
	}

	private async restoreImmersiveMode() {
		try {
			await Fullscreen.activateImmersiveMode()
			await StatusBar.hide()
		} catch (error) {
			console.warn('[admob] immersive mode', error)
		}
	}

	initialize() {
		// No-op on web: the game also ships as a PWA from docs/, where the plugin
		// has no implementation to call.
		if (!this.isNative) return Promise.resolve()
		if (!this.initPromise) {
			this.initPromise = this.runInitialize()
		}
		return this.initPromise
	}

	private async runInitialize() {
		await AdMob.initialize(AdMobInitializationOptions)
		this.initialized = true

		// Не про рекламу, а про место под неё: где именно окажется баннер, решает
		// система, и вёрстке надо это повторить.
		await this.applyBannerSafeArea()

		// Warm up the first interstitial so a game over never waits on a load.
		void this.preloadInterstitial()

		// The UMP consent form is deliberately never requested. Every request is
		// tagged tagForUnderAgeOfConsent, and a user below the age of consent is not
		// asked to consent to ad personalisation — showing them a personalisation
		// form is wrong under both GDPR and the Families Policy. Non-personalised
		// delivery is guaranteed by npa: true on every request.
	}

	/** Serialises banner work: one native view operation at a time. */
	private queue(work: () => Promise<void>): Promise<void> {
		this.bannerLock = this.bannerLock.then(work, work)
		return this.bannerLock
	}

	showBanner() {
		if (!this.isNative) return Promise.resolve()
		return this.queue(() => this.runShowBanner())
	}

	private async runShowBanner() {
		if (this.bannerVisible) return

		// Wait for the child-directed configuration; if initialization failed there
		// is no safe way to request an ad, so show none.
		await this.initialize().catch((error) => console.log(error))
		if (!this.initialized) return

		if (!this.bannerListenersRegistered) {
			this.bannerListenersRegistered = true

			await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
				this.bannerLoaded = true
				this.setSafeArea(true)
				this.publish(true, this.bannerHeight || BANNER_FALLBACK_HEIGHT)
			})

			await AdMob.addListener(
				BannerAdPluginEvents.SizeChanged,
				(size: AdMobBannerSize) => {
					// Нули означают, что баннера на экране нет: отказ, скрытие или
					// снятие. Не «объявление нулевой высоты», а его отсутствие.
					if (!size.height) {
						this.clearBanner()
						return
					}

					// Настоящая высота заменяет резерв, как только стала известна. О
					// самом наличии объявления это событие не говорит, поэтому
					// состояние слота остаётся тем, какое было.
					this.bannerHeight = size.height
					this.setSlotHeight(size.height)
					this.setSafeArea(true)
					this.publish(this.bannerLoaded, size.height)
				}
			)

			// No fill, no network, no ad: give the space back. Without this the
			// reserve stayed put and the game ran with an empty black strip along
			// the top for the rest of the session — fifty-odd pixels taken from
			// the tower in exchange for nothing.
			// Нет заполнения, нет сети, нет объявления: место остаётся за слотом,
			// но рисует в нём снова кросс-промо. Раньше здесь резерв обнулялся —
			// и вёрстка прыгала вверх ровно так же, как раньше прыгала вниз.
			await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error?: AdMobError) => {
				// Причину видно только здесь, и раньше она терялась молча —
				// «объявления нет» выглядело одинаково и при отсутствии спроса, и
				// при неверной настройке. Коды AdMob: 0 — внутренняя ошибка,
				// 1 — неверный запрос (чаще всего чужой или опечатанный блок),
				// 2 — нет сети, 3 — нет заполнения. Третий на детском инвентаре
				// и новом приложении — норма, остальные три означают поломку.
				console.warn('[admob] баннер не загрузился', error?.code, error?.message)
				this.bannerFault?.(`${error?.code ?? '?'} ${error?.message ?? 'нет причины'}`)
				this.clearBanner()
				// Ничего не показано — значит следующий заход имеет право
				// попробовать снова, а не считать баннер уже стоящим.
				this.bannerVisible = false
			})
		}

		// Место уже занято резервом из `:root`, отдельно объявлять его не нужно.

		const options: BannerAdOptions = {
			adId: 'ca-app-pub-9702825788968948/2239900584',
			adSize: BannerAdSize.ADAPTIVE_BANNER,
			// Top, not bottom. At the bottom it sat directly over the answer row
			// and the score line — the two things the player touches and reads.
			position: BannerAdPosition.TOP_CENTER,
			margin: 0,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
		}

		try {
			await AdMob.showBanner(options)
			this.bannerVisible = true
		} catch (error) {
			// Отказ самого вызова, а не отсутствие спроса: неверный размер, мёртвый
			// блок, плагин без нативной части. Событие `FailedToLoad` в этом случае
			// не приходит вовсе, и без своей ветки причина терялась.
			console.warn('[admob] showBanner отклонён', error)
			this.bannerFault?.(String((error as Error)?.message ?? error))
			throw error
		}
	}

	async resumeBanner() {
		if (!this.isNative) return
		await AdMob.resumeBanner()
	}

	async hideBanner() {
		if (!this.isNative) return
		this.clearBanner()
		await AdMob.hideBanner()
	}

	removeBanner() {
		if (!this.isNative) return Promise.resolve()
		return this.queue(async () => {
			if (!this.bannerVisible) return
			this.bannerVisible = false
			this.clearBanner()
			await AdMob.removeBanner()
		})
	}

	private interstitialOptions(): AdOptions {
		return {
			adId: 'ca-app-pub-9702825788968948/8253981889',
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
			// Deliberately not setting immersiveMode: since Android 15 forces
			// edge-to-edge it pushes the ad's close button under the navigation bar
			// or cutout, making the ad unclosable — a Families policy rejection.
		}
	}

	// Interstitial listeners are registered once for the app's lifetime; the
	// per-show state lives in the fields above.
	private registerInterstitialListeners() {
		if (this.interstitialListenersRegistered) return
		this.interstitialListenersRegistered = true

		void AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
			console.log(info)
			this.interstitialReady = true
			this.interstitialLoading = false
		})
		void AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
			console.log('Dismissed')
			this.interstitialReady = false
			this.handleInterstitialClosed()
		})
		void AdMob.addListener(
			InterstitialAdPluginEvents.FailedToLoad,
			(error?: AdMobError) => {
				console.warn('[admob] межстраничная не загрузилась', error?.code, error?.message)
				this.interstitialReady = false
				this.interstitialLoading = false
				this.handleInterstitialClosed()
			}
		)
		void AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
			console.log('FailedToShow')
			this.interstitialReady = false
			this.handleInterstitialClosed()
		})
	}

	/**
	 * Loads the next interstitial in the background, so that at a game over the
	 * ad is either already there or skipped — the result screen never waits on a
	 * network load. Called after initialize() and after every dismiss.
	 */
	async preloadInterstitial() {
		if (!this.isNative || !this.initialized) return
		if (this.interstitialReady || this.interstitialLoading) return
		this.registerInterstitialListeners()

		this.interstitialLoading = true
		try {
			await AdMob.prepareInterstitial(this.interstitialOptions())
			this.interstitialReady = true
		} catch (error) {
			console.log(error)
			this.interstitialReady = false
		} finally {
			this.interstitialLoading = false
		}
	}

	// The ad is definitely gone: release the game and put the bars back.
	private handleInterstitialClosed() {
		this.releaseInterstitialFlow()
		this.restoreBarsAfterAd()
	}

	// Releasing the game flow and putting the system bars back are separate on
	// purpose. The watchdog fires while the ad may still be on screen, and
	// re-hiding the bars at that moment would push the ad's close button under
	// the navigation bar — the exact "unclosable ads" rejection this file goes
	// out of its way to avoid. The callback fires exactly once per show.
	private releaseInterstitialFlow() {
		if (this.interstitialClosed) return
		this.interstitialClosed = true
		if (this.watchdogID) {
			clearTimeout(this.watchdogID)
			this.watchdogID = undefined
		}
		const cb = this.onInterstitialClosed
		this.onInterstitialClosed = null
		if (cb) cb()

		void this.preloadInterstitial()
	}

	private restoreBarsAfterAd() {
		if (!this.barsShownForAd) return
		this.barsShownForAd = false
		void this.restoreImmersiveMode()
	}

	async interstitial({
		isFirst,
		onInterstitialAdClosed,
	}: {
		isFirst: boolean,
		onInterstitialAdClosed: () => void
	}) {
		// Web (PWA build): nothing to show, hand control straight back.
		if (!this.isNative) {
			onInterstitialAdClosed()
			return
		}

		// Not initialized yet: skip the ad and hand control straight back to the
		// game rather than sending a request without the child-directed tags.
		if (!this.initialized) {
			onInterstitialAdClosed()
			return
		}

		// The very first game never shows an ad, the first minutes after launch
		// are ad-free (most players who leave do so early in the first session),
		// the frequency cap skips one that would come too soon, and a show already
		// on screen is never doubled. Either way the close callback still fires so
		// the caller's loading state is cleared.
		const now = Date.now()
		if (
			isFirst ||
			now - this.startedAt < INTERSTITIAL_GRACE_MS ||
			now - lastInterstitialShownAt < INTERSTITIAL_MIN_INTERVAL_MS ||
			!this.interstitialClosed
		) {
			onInterstitialAdClosed()
			void this.preloadInterstitial()
			return
		}

		// Not loaded yet: never load on demand — that is what kept the result
		// screen behind a loading overlay. Skip this one and warm up the next.
		if (!this.interstitialReady) {
			onInterstitialAdClosed()
			void this.preloadInterstitial()
			return
		}

		// Claim the slot before the first await, so a second call arriving while
		// this one is in flight is capped instead of showing a second ad.
		lastInterstitialShownAt = now
		this.interstitialReady = false
		this.onInterstitialClosed = onInterstitialAdClosed
		this.interstitialClosed = false

		// Restore the system bars for the duration of the ad so its close button
		// can never sit under the navigation bar (Families policy).
		await this.showSystemBars()
		this.barsShownForAd = true

		// Close is driven by the Dismissed/Failed listeners; the watchdog covers
		// the case where neither event ever fires. It only releases the game flow
		// — the bars go back when the ad is actually gone.
		this.watchdogID = setTimeout(() => {
			console.log('Interstitial dismiss watchdog fired')
			this.releaseInterstitialFlow()
		}, DISMISS_WATCHDOG_MS)

		try {
			await AdMob.showInterstitial()
		} catch (error) {
			console.log(error)
			this.handleInterstitialClosed()
		}
	}
}

export default new Admob()
