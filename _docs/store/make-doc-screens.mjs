// Пересобирает кадры для _docs/GAME.md — те, что стоят прямо в тексте. Все
// портретные 780×1688 (390×844 при dpr 2), как и прежний набор.
//
// Нужен запущенный предпросмотр собранной игры:
//   node node_modules/vite/bin/vite.js preview --port 4217
// Затем из корня проекта:
//   node _docs/store/make-doc-screens.mjs
//
// PATCHRIGHT — путь до headless-браузера. Версия расширения меняется, поэтому
// путь вынесен наверх: если скрипт падает с ERR_MODULE_NOT_FOUND, поправить его.
const PATCHRIGHT =
	'file:///C:/Users/nurik/.vscode/extensions/danielsanmedium.dscodegpt-3.24.53/standalone/node_modules/patchright/index.mjs'

const { chromium } = await import(PATCHRIGHT)

const OUT = 'd:/WORK/completed/03-MathBoxes/_docs/screens/'
const URL = 'http://localhost:4217/'
const LANG = 'en'

const browser = await chromium.launch()
const page = await browser.newPage({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
})
const errors = []
const shots = []
page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)))

const shot = async (name) => {
	await page.screenshot({ path: OUT + name + '.png' })
	shots.push(name)
}

await page.addInitScript((l) => localStorage.setItem('CapacitorStorage.lang', l), LANG)

/** Считает ход по башне: под пустым сокетом лежат операнд, операция, операнд. */
const answer = async (correct) => {
	const st = await page.evaluate(() => ({
		blocks: [...document.querySelectorAll('.block')].map((b) => ({
			text: b.querySelector('.block__text')?.textContent.trim() ?? '',
			op: b.className.includes('is-op'),
		})),
		opts: [...document.querySelectorAll('.answer')].map((e) => Number(e.textContent.trim())),
	}))
	if (!st.blocks.length || !st.opts.length) return false
	const [, first, second, third] = st.blocks
	let want
	if (first.op) {
		const arg = Number(second.text)
		want =
			first.text === '\u221a'
				? Math.sqrt(arg)
				: Math.round(Math.log(arg) / Math.log(Number(first.text.replace(/\D/g, ''))))
	} else {
		const b = Number(first.text)
		const sign = second.text
		const a = Number(third.text)
		want =
			sign === '+'
				? a + b
				: sign === '\u2212'
					? a - b
					: sign === '\u00d7'
						? a * b
						: sign === '\u00f7'
							? a / b
							: Math.pow(a, b)
	}
	let idx = st.opts.indexOf(want)
	if (idx < 0) idx = 0
	if (!correct) idx = (idx + 1) % st.opts.length
	await page.locator('.answer').nth(idx).click()
	return true
}

// -------------------------------------------------------------- главная ----
await page.goto(URL, { waitUntil: 'networkidle' })
// Кубики логотипа появляются с задержкой 90 мс друг за другом.
await page.waitForTimeout(1400)
await shot('01-home')

await page.locator('.link').first().click()
await page.waitForTimeout(700)
await shot('03-help')
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)

await page.locator('.icon-btn').first().click()
await page.waitForTimeout(700)
await shot('10-settings')

// --------------------------------------------------------------- партия ----
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.locator('.play').click()
await page.waitForTimeout(600)
await shot('04-countdown')
await page.waitForTimeout(2200)

// Верные ответы: башня, момент попадания и повышение уровня.
let gotLevelUp = false
for (let i = 0; i < 16; i++) {
	if (await page.locator('.result').count()) break
	if (!(await answer(true))) break
	await page.waitForTimeout(280)
	if (i === 3) await shot('06-correct')
	if (!gotLevelUp && (await page.locator('.say__levelup').count())) {
		await shot('11-levelup')
		gotLevelUp = true
	}
	await page.waitForTimeout(680)
	if (i === 5) await shot('05-board')
}

await page.locator('.hud__btn').first().click()
await page.waitForTimeout(600)
await shot('08-pause')
await page.locator('.overlay__btn').first().click()
await page.waitForTimeout(700)

// Промах: сначала верное число красным, потом — башня уже без сердца.
await answer(false)
await page.waitForTimeout(300)
await shot('07-wrong')
await page.waitForTimeout(1400)
await shot('15-hearts')

// ----------------------------------------------------------------- итог ----
for (let i = 0; i < 12; i++) {
	if (await page.locator('.result').count()) break
	if (!(await answer(false))) break
	await page.waitForTimeout(1000)
}
await page.waitForTimeout(1200)
if (await page.locator('.result').count()) await shot('09-result')

// Мастерство на главной — только после доигранной партии, когда оно начислено.
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(1400)
await shot('13-mastery')

await browser.close()
console.log(JSON.stringify({ shots, errors }, null, 1))
