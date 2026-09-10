// Снимает скриншоты для карточки Play в трёх форматах: телефон, 7" и 10"
// планшет. Все портретные PNG, размеры в пределах требований Play (сторона от
// 320 до 3840 px).
//
// Нужен запущенный предпросмотр собранной игры:
//   node node_modules/vite/bin/vite.js preview --port 4217
// Затем из корня проекта:
//   node _docs/store/make-screenshots.mjs
//
// PATCHRIGHT — путь до headless-браузера. Версия расширения меняется, поэтому
// путь вынесен наверх: если скрипт падает с ERR_MODULE_NOT_FOUND, поправить его.
const PATCHRIGHT =
	'file:///C:/Users/nurik/.vscode/extensions/danielsanmedium.dscodegpt-3.24.53/standalone/node_modules/patchright/index.mjs'

const { chromium } = await import(PATCHRIGHT)
const { mkdirSync } = await import('node:fs')

const ROOT = 'd:/WORK/completed/03-MathBoxes/_docs/store/screenshots'
const URL = 'http://localhost:4217/'

// Язык кадров. Игра берёт язык устройства, а браузер здесь русский, поэтому для
// витрины он задаётся явно. Английский — язык карточки по умолчанию.
const LANG = 'en' 

// Логический размер × dpr = то, что уходит в консоль. Планшетные профили шире
// 600 px, то есть попадают под правила широкого экрана в вёрстке.
const DEVICES = [
	{ dir: 'phone', width: 540, height: 960, dpr: 2 }, // 1080×1920
	{ dir: 'tablet7', width: 600, height: 960, dpr: 2 }, // 1200×1920
	{ dir: 'tablet10', width: 800, height: 1280, dpr: 2 }, // 1600×2560
]

/** Считает ответ по тому, что нарисовано на экране, чтобы играть правильно. */
function solve(nums, sign) {
	if (sign === '+') return nums[0] + nums[1]
	if (sign === '\u2212') return nums[0] - nums[1]
	if (sign === '\u00d7') return nums[0] * nums[1]
	if (sign === '\u00f7') return nums[0] / nums[1]
	if (sign === '\u221a') return Math.sqrt(nums[0])
	if (sign === 'log') return Math.round(Math.log(nums[1]) / Math.log(nums[0]))
	return Math.pow(nums[0], nums[1])
}

const browser = await chromium.launch()
const report = []

for (const device of DEVICES) {
	const out = `${ROOT}/${device.dir}/`
	mkdirSync(out, { recursive: true })

	const page = await browser.newPage({
		viewport: { width: device.width, height: device.height },
		deviceScaleFactor: device.dpr,
	})
	const shots = []
	const errors = []
	page.on('pageerror', (e) => errors.push(e.message.slice(0, 90)))

	const shot = async (name) => {
		await page.screenshot({ path: out + name + '.png' })
		shots.push(name)
	}

	await page.addInitScript((l) => localStorage.setItem('CapacitorStorage.lang', l), LANG)
	await page.goto(URL, { waitUntil: 'networkidle' })
	// Кубики логотипа появляются с задержкой 90 мс друг за другом — на 400 мс
	// последняя буква ещё не долетела и в кадр попадало «MAT».
	await page.waitForTimeout(1400)
	await shot('1-home')

	// Цепочка — единственный режим, поэтому просто запускаем.
	await page.locator('.play').click()
	await page.waitForTimeout(2500)

	// Ход читается прямо с башни: блоки идут сверху вниз, поэтому под пустым
	// сокетом лежат второй операнд, операция и первый операнд.
	const answer = async (correct) => {
		const st = await page.evaluate(() => ({
			blocks: [...document.querySelectorAll('.block')].map((b) => ({
				text: b.querySelector('.block__text')?.textContent.trim() ?? '',
				op: b.className.includes('is-op'),
			})),
			opts: [...document.querySelectorAll('.answer')].map((e) => Number(e.textContent.trim())),
		}))
		const [, first, second, third] = st.blocks
		let want
		if (first.op) {
			// Корень и логарифм несут операнд в себе.
			const arg = Number(second.text)
			want =
				first.text === '√'
					? Math.sqrt(arg)
					: Math.round(Math.log(arg) / Math.log(Number(first.text.replace(/\D/g, ''))))
		} else {
			const b = Number(first.text)
			const a = Number(third.text)
			const sign = second.text
			if (sign === '+') want = a + b
			else if (sign === '−') want = a - b
			else if (sign === '×') want = a * b
			else if (sign === '÷') want = a / b
			else want = Math.pow(a, b)
		}
		let idx = st.opts.indexOf(want)
		if (idx < 0) idx = 0
		if (!correct) idx = (idx + 1) % Math.max(1, st.opts.length)
		await page.locator('.answer').nth(idx).click()
	}

	// Верные ответы: они и дают кадры цепочки, и копят мастерство для главной.
	for (let i = 0; i < 14; i++) {
		if (await page.locator('.result').count()) break
		if (i === 4) await shot('2-chain')
		await answer(true)
		await page.waitForTimeout(320)
		if (i === 5) await shot('3-correct')
		if (i === 6) await shot('5-streak')
		await page.waitForTimeout(640)
	}

	// Партия заканчивается промахами — так итог приходит без ожидания таймера.
	for (let i = 0; i < 6; i++) {
		if (await page.locator('.result').count()) break
		await answer(false)
		await page.waitForTimeout(950)
	}
	await page.waitForTimeout(1200)
	if (await page.locator('.result').count()) await shot('6-result')

	// Уровни по операциям — после доигранной партии, когда мастерство начислено.
	await page.goto(URL, { waitUntil: 'networkidle' })
	await page.waitForTimeout(1400)
	await shot('4-levels')

	await page.close()
	report.push({
		device: device.dir,
		size: `${device.width * device.dpr}x${device.height * device.dpr}`,
		shots: shots.length,
		errors,
	})
}

await browser.close()
console.log(JSON.stringify(report, null, 1))
