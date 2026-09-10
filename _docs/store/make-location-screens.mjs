// Снимает по кадру на каждую локацию: небо вместе с её опасностью внизу.
//
// Локация задаётся настройкой, поэтому подниматься до неё не нужно — засеваем
// тему и играем несколько ходов, чтобы под ногами выросла башня. Раньше здесь
// бот лез на сотню этажей: локации менялись по высоте, и другого способа
// увидеть дальние не было.
//
// Отдельно от make-page-screens.mjs намеренно: тот прогоняется после каждой
// правки, а этот нужен только когда меняются сами локации.
//
// Нужен запущенный сервер:
//   node node_modules/vite/bin/vite.js --mode development --port 4236
// Затем из корня проекта:
//   node _docs/store/make-location-screens.mjs [порт]

import fs from 'node:fs'
import path from 'node:path'

/** Путь до patchright внутри расширения — версия меняется, поэтому ищем сами. */
function findPatchright() {
	const root = 'C:/Users/nurik/.vscode/extensions'
	const hit = fs
		.readdirSync(root)
		.filter((d) => d.startsWith('danielsanmedium.dscodegpt-'))
		.sort()
		.reverse()
		.map((d) => path.join(root, d, 'standalone/node_modules/patchright/index.mjs'))
		.find((p) => fs.existsSync(p))
	if (!hit) throw new Error('patchright не найден в расширениях VSCode')
	return 'file:///' + hit.split(String.fromCharCode(92)).join('/')
}

const { chromium } = await import(findPatchright())

const PORT = process.argv[2] || '4236'
const OUT = 'd:/WORK/completed/03-MathBoxes/_docs/screens/locations/'
const PLACES = ['city', 'valley', 'winter', 'canyon', 'night', 'space']

fs.mkdirSync(OUT, { recursive: true })

const GLYPH = {
	'+': (a, b) => a + b,
	'\u2212': (a, b) => a - b,
	'\u00d7': (a, b) => a * b,
	'\u00f7': (a, b) => a / b,
}
const CAND = '.block:not(.block--built):not(.block--ghost)'

const browser = await chromium.launch()
const errors = []
const seen = []

for (const place of PLACES) {
	const page = await browser.newPage({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		locale: 'ru',
	})
	page.on('pageerror', (e) => errors.push(`${place}: ${e.message.slice(0, 160)}`))
	page.on('console', (m) => {
		if (m.type() === 'error' && !/websocket|MIME|net::ERR/i.test(m.text())) {
			errors.push(`${place}: ${m.text().slice(0, 160)}`)
		}
	})

	await page.addInitScript((id) => {
		localStorage.setItem('CapacitorStorage.lang', 'ru')
		localStorage.setItem('CapacitorStorage.theme', id)
	}, place)
	await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
	await page.waitForTimeout(1100)
	await page.locator('.big--play').click()
	await page.waitForTimeout(800)

	// Пять верных ответов: нужна башня под ногами, иначе кадр показывает пустую
	// сцену и по нему не видно, как локация выглядит в игре.
	for (let i = 0; i < 5; i++) {
		const state = await page.evaluate((sel) => ({
			expr: document.querySelector('.ask__expr')?.textContent.replace('= ?', '').trim() ?? '',
			values: [...document.querySelectorAll(sel)].map((e) => Number(e.textContent.trim())),
		}), CAND)
		if (!state.values.length) {
			await page.waitForTimeout(200)
			continue
		}
		const [a, sign, b] = state.expr.split(/\s+/)
		const want = GLYPH[sign]?.(Number(a), Number(b))
		let index = state.values.indexOf(want)
		if (index < 0) index = 0
		// `force`: мир на доске оседает к воде каждый кадр, и «стабильным» блок
		// не бывает никогда.
		await page.locator(CAND).nth(index).click({ timeout: 3000, force: true })
		await page.waitForTimeout(760)
	}

	const got = await page.evaluate(() => ({
		zone: (document.querySelector('.band')?.className.match(/zone-(\w+)/) || [])[1] ?? null,
		hazard: (document.querySelector('.hazard')?.className.match(/is-(\w+)/) || [])[1] ?? null,
		floor: Number(document.querySelector('.hud__height')?.textContent.trim() ?? 0),
	}))
	if (got.zone !== place) errors.push(`${place}: на доске зона ${got.zone}`)

	await page.screenshot({ path: `${OUT}${place}-${got.hazard}.png` })
	seen.push({ локация: place, ...got })
	await page.close()
}

console.log(JSON.stringify({ seen, errors }, null, 1))
await browser.close()
if (errors.length) process.exitCode = 1
