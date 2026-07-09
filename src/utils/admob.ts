import {
	AdMob,
	AdmobConsentStatus,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	AdMobBannerSize,
	BannerAdOptions,
	InterstitialAdPluginEvents,
	AdLoadInfo,
	AdOptions,
} from '@capacitor-community/admob'
import type { PluginListenerHandle } from '@capacitor/core'

const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	// Mode-based: enable test ads only in dev builds, real ads in production.
	initializeForTesting: import.meta.env.DEV,
	// tagForChildDirectedTreatment removed (was `true`): forcing COPPA child
	// treatment disables personalized ads and heavily reduces revenue. If this
	// app is legally directed at children, set the audience in the AdMob
	// console instead of forcing it client-side.
	// TODO(owner): confirm target-audience / COPPA policy in AdMob console.
}

// Frequency cap: show at most one interstitial per this interval.
const INTERSTITIAL_MIN_INTERVAL_MS = 90 * 1000
let lastInterstitialShownAt = 0

class Admob {
	// Guard so banner event listeners are registered only once (prevents a
	// listener leak: showBanner() runs on every entry to the play screen).
	private bannerListenersRegistered = false

	async initialize() {
		await AdMob.initialize(AdMobInitializationOptions)

		const [trackingInfo, consentInfo] = await Promise.all([
			AdMob.trackingAuthorizationStatus(),
			AdMob.requestConsentInfo(),
		])

		if (trackingInfo.status === 'notDetermined') {
			// console.log('Display information before ads load first time')
		} else if (
			trackingInfo.status === 'authorized' &&
			consentInfo.isConsentFormAvailable &&
			consentInfo.status === AdmobConsentStatus.REQUIRED
		) {
			await AdMob.showConsentForm()
		}
	}

	async showBanner() {
		if (!this.bannerListenersRegistered) {
			this.bannerListenersRegistered = true

			await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
				// Subscribe Banner Event Listener
			})

			await AdMob.addListener(
				BannerAdPluginEvents.SizeChanged,
				(size: AdMobBannerSize) => {
					console.log(size)
					// Subscribe Change Banner Size
				}
			)
		}

		const options: BannerAdOptions = {
			adId: 'ca-app-pub-9702825788968948/2239900584',
			adSize: BannerAdSize.ADAPTIVE_BANNER,
			position: BannerAdPosition.BOTTOM_CENTER,
			margin: 0,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// npa: true
		}

		await AdMob.showBanner(options)
	}

	async resumeBanner() {
		await AdMob.resumeBanner()
	}

	async hideBanner() {
		await AdMob.hideBanner()
	}

	async removeBanner() {
		await AdMob.removeBanner()
	}

	async interstitial({
		isFirst,
		onInterstitialAdClosed,
	}: {
		isFirst: boolean,
		onInterstitialAdClosed: () => void
	}) {
		// Frequency cap: skip showing if we showed one too recently. Still fire
		// the close callback so the caller's loading state is cleared.
		if (
			!isFirst &&
			Date.now() - lastInterstitialShownAt < INTERSTITIAL_MIN_INTERVAL_MS
		) {
			onInterstitialAdClosed()
			return
		}

		const handles: PluginListenerHandle[] = []
		let isClosed = false

		async function cleanup() {
			for (const handle of handles) {
				try {
					await handle.remove()
				} catch {
					// ignore
				}
			}
			handles.length = 0
		}

		function closeAds() {
			if (isClosed) return
			isClosed = true
			onInterstitialAdClosed()
			// Remove this call's listeners so they don't accumulate across games.
			cleanup()
		}

		handles.push(
			await AdMob.addListener(
				InterstitialAdPluginEvents.Loaded,
				(info: AdLoadInfo) => {
					console.log(info)
				}
			)
		)
		handles.push(
			await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
				console.log('Dismissed')
				closeAds()
			})
		)
		handles.push(
			await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
				console.log('FailedToLoad')
				closeAds()
			})
		)
		handles.push(
			await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
				console.log('FailedToShow')
				closeAds()
			})
		)

		const options: AdOptions = {
			adId: 'ca-app-pub-9702825788968948/8253981889',
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// npa: true
		}

		try {
			await AdMob.prepareInterstitial(options)
			if (!isFirst) {
				await AdMob.showInterstitial()
				lastInterstitialShownAt = Date.now()
				// Close is driven by the Dismissed/Failed listeners above.
			} else {
				// Preload only (not shown): drop listeners to avoid a leak.
				await cleanup()
			}
		} catch (error) {
			console.log(error)
			closeAds()
		}
	}
}

export default new Admob()
