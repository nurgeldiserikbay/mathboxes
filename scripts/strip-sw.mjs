/**
 * Takes the service worker out of the Android payload, after `cap sync` has put
 * it there.
 *
 * `webDir` is `docs/`, and `docs/` is two things at once: the PWA published to
 * GitHub Pages, which wants a worker, and the payload copied into the APK, which
 * must not have one. Capacitor copies the directory wholesale, so the only place
 * the two can be told apart is here — after the copy, before the build.
 *
 * Why it matters: Capacitor serves the app from `https://localhost`, a secure
 * origin, so a worker installs inside the webview exactly as it would in a
 * browser. Its navigation route then answers every launch out of Cache Storage,
 * and Cache Storage survives an app update — so a new APK lands on the device
 * and the old build keeps opening. `main.ts` no longer registers one, which
 * fixes clean installs; this fixes the installs that already have one, because
 * a worker whose script has gone 404 is dropped by the browser on its next
 * update check instead of living on forever.
 */
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const PAYLOAD = 'android/app/src/main/assets/public'
const WORKER_FILES = /^(sw\.js|registerSW\.js|workbox-[\w-]+\.js)$/

let entries
try {
	entries = await readdir(PAYLOAD)
} catch {
	console.log(`[strip-sw] ${PAYLOAD} is not there — nothing to do`)
	process.exit(0)
}

const removed = []
for (const name of entries) {
	if (!WORKER_FILES.test(name)) continue
	await rm(join(PAYLOAD, name), { force: true })
	removed.push(name)
}

console.log(
	removed.length
		? `[strip-sw] out of the APK: ${removed.join(', ')}`
		: '[strip-sw] no worker in the APK payload — already clean'
)
