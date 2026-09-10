/**
 * Says which build is actually inside the APK.
 *
 * "I built it and the old version opened" has had three separate causes in this
 * project — a service worker serving its own cache, a stale Gradle asset merge,
 * and an old signed artifact installed by hand — and none of them are visible
 * from the source tree. This reads the packaged file instead and prints what a
 * device would really run, so the question stops being a matter of opinion.
 *
 *   node scripts/verify-apk.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const OUTPUTS = 'android/app/build/outputs'
const WEB = 'docs'

/** The hashed entry chunk the page loads — the one thing that identifies a build. */
async function bundleOf(html) {
	return html.match(/assets\/index-[\w-]+\.js/)?.[0] ?? null
}

async function currentBundle() {
	try {
		return await bundleOf(await readFile(join(WEB, 'index.html'), 'utf8'))
	} catch {
		return null
	}
}

/**
 * The instrumentation package. Gradle builds it alongside the app, it carries no
 * web payload at all, and reporting it as a mismatch is exactly the kind of
 * false alarm that teaches people to ignore the tool.
 */
const TEST_PACKAGE = /androidTest/i

/** Every apk/aab under the build outputs, newest first. */
async function findPackages(dir, found = []) {
	let entries
	try {
		entries = await readdir(dir, { withFileTypes: true })
	} catch {
		return found
	}
	for (const entry of entries) {
		const path = join(dir, entry.name)
		if (TEST_PACKAGE.test(entry.name)) continue
		if (entry.isDirectory()) await findPackages(path, found)
		else if (/\.(apk|aab)$/.test(entry.name)) found.push(path)
	}
	return found
}

/**
 * Picks something that can read a zip, once.
 *
 * Windows ships bsdtar as `tar`, which reads zips; Git Bash puts GNU tar on the
 * PATH first, and that one cannot. Guessing wrong made a perfectly good package
 * look empty, which is worse than not checking at all — so the reader is chosen
 * by trying it, and if nothing works the report says so instead of inventing a
 * verdict.
 */
function pickReader(sample) {
	const candidates = [
		{ name: 'tar', list: ['-tf', sample], read: (a, m) => ['-xOf', a, m] },
		{ name: 'unzip', list: ['-l', sample], read: (a, m) => ['-p', a, m] },
		{ name: '7z', list: ['l', sample], read: (a, m) => ['e', '-so', a, m] },
	]
	for (const tool of candidates) {
		try {
			execFileSync(tool.name, tool.list, { stdio: 'ignore' })
			return tool
		} catch {
			// Not installed, or cannot read this format. Try the next one.
		}
	}
	return null
}

let reader = null

/** The file's text, `''` when the archive has no such member, `null` when the
 *  archive could not be read at all. */
function readFromZip(archive, member) {
	if (!reader) return null
	try {
		return execFileSync(reader.name, reader.read(archive, member), {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		})
	} catch {
		return ''
	}
}

const expected = await currentBundle()
console.log(`docs/ currently builds: ${expected ?? '(no index.html — run the build first)'}\n`)

const packages = await findPackages(OUTPUTS)
if (!packages.length) {
	console.log(`Nothing in ${OUTPUTS}. Build in Android Studio first, then run this again.`)
	process.exit(0)
}

const rows = await Promise.all(
	packages.map(async (path) => ({ path, when: (await stat(path)).mtime }))
)
rows.sort((a, b) => Number(b.when) - Number(a.when))

reader = pickReader(rows[0].path)
if (!reader) {
	console.log(
		'No tool on PATH can read a zip (tried tar, unzip, 7z), so the packages ' +
			'cannot be opened. On Windows run this from PowerShell, where `tar` is bsdtar.'
	)
	process.exit(1)
}


let stale = 0
/** The newest package that both matches and can actually go on a phone. */
let installable = null

for (const { path, when } of rows) {
	const isBundle = path.endsWith('.aab')
	const html =
		readFromZip(path, isBundle ? 'base/assets/public/index.html' : 'assets/public/index.html') ??
		readFromZip(path, 'assets/public/index.html')

	const bundle = html ? await bundleOf(html) : null
	const worker = html ? /registerSW|sw\.js/.test(html) : false
	// Local time, not UTC: this line exists to be compared against a clock the
	// person reading it can see.
	const stamp = when.toLocaleString('sv-SE', { hour12: false }).slice(0, 16)

	// No web payload: an instrumentation or split package, not a build of the game.
	if (!bundle) {
		console.log(`--   ${stamp}  ${path}`)
		console.log('       no web payload — not an app package')
		continue
	}

	// AGP names it this way when the variant has no signing config, and Android
	// refuses to install such a file. Leaving it in the list as if it were a
	// candidate is how the wrong package gets picked.
	const unsigned = /-unsigned\./.test(path)
	const match = expected !== null && bundle === expected

	if (!match) stale += 1
	if (match && !unsigned && !installable) installable = path

	const verdict = unsigned ? '--  ' : match ? 'OK  ' : 'OLD '
	console.log(`${verdict} ${stamp}  ${path}`)
	console.log(
		`       ${bundle}` +
			(worker ? '  + registers a service worker' : '') +
			(unsigned ? '  — unsigned, cannot be installed' : '')
	)
}

// Naming the file is the point. Listing facts and leaving the choice to the
// reader is exactly how an APK from three weeks ago kept getting installed.
console.log(
	installable
		? `\nInstall this one:\n  ${installable}`
		: '\nNothing here matches the current build — rebuild in Android Studio, then run this again.'
)

if (stale) {
	console.log(`(${stale} other package(s) are behind the current build — do not install those.)`)
}
