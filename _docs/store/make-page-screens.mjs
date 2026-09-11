// Снимает все экраны игры — то, что игрок вообще может увидеть: главная,
// настройки, справка, доска на разных стадиях подъёма, опора, промах, обвал,
// пауза и итог. Портрет 780×1688 (390×844 при dpr 2).
//
// Нужен запущенный сервер:
//   node node_modules/vite/bin/vite.js --mode development --port 4218
// Затем из корня проекта:
//   node _docs/store/make-page-screens.mjs [ru|en|kk|de|es|fr] [порт]

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

const LANG = process.argv[2] || 'ru'
const PORT = process.argv[3] || '4218'
const OUT = 'd:/WORK/completed/03-MathBoxes/_docs/screens/pages/'
const URL = `http://localhost:${PORT}/`

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	locale: LANG,
})

const errors = []
const shots = []
page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))

/*
   Сбор ошибок внутри страницы.

   `pageerror` ловит не всё: ошибка внутри хука Vue приходит отвергнутым
   промисом, а он этого события не вызывает. Именно так однажды и проехала
   ссылка на удалённый таймер в `onBeforeUnmount` — прогон был зелёным, а
   приложение падало на кнопке «играть ещё». Поэтому слушаем и то, и другое
   изнутри страницы, а в конце забираем накопленное.
*/
await page.addInitScript(() => {
	window.__errs = []
	addEventListener('error', (e) => window.__errs.push('error: ' + (e.message || e.type)))
	addEventListener('unhandledrejection', (e) =>
		window.__errs.push('rejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason))
	)
})
page.on('console', (m) => {
	// Вебсокет HMR и MIME-предупреждения dev-сервера к игре не относятся.
	if (m.type() === 'error' && !/websocket|MIME|net::ERR/i.test(m.text())) {
		errors.push('console: ' + m.text().slice(0, 200))
	}
})

const shot = async (name) => {
	await page.screenshot({ path: OUT + name + '.png' })
	shots.push(name)
}

const RECORDS = JSON.stringify({
	bestFloor: 34,
	bestScore: 18240,
	gamesPlayed: 26,
	totalCorrect: 418,
})

/**
 * Язык. Ставится один раз на контекст: `clear()` здесь стоять не может —
 * init-скрипт исполняется на КАЖДОЙ навигации и стёр бы засеянный рекорд.
 * Первый кадр и так снимается в чистом профиле.
 */
const seedLang = () =>
	page.addInitScript((l) => {
		localStorage.setItem('CapacitorStorage.lang', l)
		// Локация закрепляется намеренно. По умолчанию она выпадает жребием, и
		// кадры доски были бы разными от прогона к прогону — сравнивать их между
		// собой стало бы нельзя. Как выглядят остальные, показывает
		// make-location-screens.mjs.
		localStorage.setItem('CapacitorStorage.theme', 'city')
	}, LANG)

/** Пройденный игрок: есть рекорд и имя. */
const seedVeteran = () =>
	page.evaluate(
		([l, r]) => {
			localStorage.setItem('CapacitorStorage.lang', l)
			localStorage.setItem('CapacitorStorage.records4', r)
			localStorage.setItem('CapacitorStorage.name', 'Andrey')
			localStorage.setItem('CapacitorStorage.theme', 'city')
		},
		[LANG, RECORDS]
	)

const home = async (wait = 1500) => {
	await page.goto(URL, { waitUntil: 'networkidle' })
	// Логотип «дышит», кубы выезжают — даём анимации встать.
	await page.waitForTimeout(wait)
}

const GLYPH = {
	'+': (a, b) => a + b,
	'\u2212': (a, b) => a - b,
	'\u00d7': (a, b) => a * b,
	'\u00f7': (a, b) => a / b,
}

/**
 * Ход. Пример теперь живёт в карточке над башней, а не на плите, поэтому
 * читается из `.ask__expr`; `correct=false` жмёт заведомо неверную кнопку.
 */
const answer = async (correct = true) => {
	const state = await page.evaluate(() => {
		const card = document.querySelector('.ask__expr')
		const opts = [...document.querySelectorAll('.answer')].map((e) =>
			Number(e.querySelector('.answer__value')?.textContent.trim())
		)
		return { expr: card?.textContent.replace('= ?', '').trim() ?? '', opts }
	})
	if (!state.expr || !state.opts.length) return false

	const [a, sign, b] = state.expr.split(/\s+/)
	const want = GLYPH[sign]?.(Number(a), Number(b))
	let index = state.opts.indexOf(want)
	if (index < 0) index = 0
	if (!correct) index = (index + 1) % state.opts.length

	await page.locator('.answer').nth(index).click({ timeout: 2500, force: true })
	return true
}

const has = async (selector) => (await page.locator(selector).count()) > 0

/** Номер этажа из HUD. */
const floorNow = () =>
	page.evaluate(() => Number(document.querySelector('.hud__height')?.textContent.trim() ?? 0))

// ------------------------------------------------------------- главная ----
await seedLang()
await home()
await shot('01-home-first-run')

await page.locator('.link').first().click()
await page.waitForTimeout(800)
await shot('02-help')

await seedVeteran()
await home()
await shot('03-home-record')

await page.locator('.round').first().click()
await page.waitForTimeout(800)
await shot('04-settings')

// -------------------------------------------------------------- партия ----
await home(1000)
await page.locator('.big--play').click()
await page.waitForTimeout(700)
await shot('05-climb-start')

/** Кандидаты — это кнопки; построенное и осыпающееся ими не являются. */
const CAND = '.block:not(.block--built):not(.block--ghost)'

const board = () =>
	page.evaluate(
		(sel) => ({
			expr: document.querySelector('.ask__expr')?.textContent.replace('= ?', '').trim() ?? '',
			values: [...document.querySelectorAll(sel)].map((e) => Number(e.textContent.trim())),
			floor: Number(document.querySelector('.hud__height')?.textContent.trim() ?? 0),
			gap: Number(document.querySelector('.hud__gap b')?.textContent.trim() ?? 0),
			over: !!document.querySelector('.over'),
		}),
		CAND
	)

/**
 * Выбрать блок. `right=false` — нарочно не тот.
 *
 * `force` здесь обязателен. Мир на доске оседает к воде каждый кадр, поэтому
 * блок никогда не «стабилен» в смысле Playwright — тот сравнивает рамку на двух
 * соседних кадрах и ждёт, пока она перестанет меняться. Ждать нечего: она
 * меняется всегда. Проверку перекрытия заменяет `state.over` выше — прогон и
 * так не жмёт по доске, когда поверх лежит карточка итога.
 */
const pick = async (right = true) => {
	// Пока персонаж падает, ряда кандидатов на доске нет вовсе — он появляется
	// с подскоком, когда падение кончится. Это не «жать не на что», а «ещё не
	// время»: без ожидания прогон обрывался посреди партии и не доходил до
	// итога.
	let state = await board()
	for (let k = 0; k < 10 && !state.over && !state.values.length; k++) {
		await page.waitForTimeout(200)
		state = await board()
	}
	if (state.over || !state.expr || !state.values.length) return null
	const [a, sign, b] = state.expr.split(/\s+/)
	const want = GLYPH[sign]?.(Number(a), Number(b))
	let index = state.values.indexOf(want)
	if (!right) index = (index + 1) % state.values.length
	if (index < 0) index = 0
	await page.locator(CAND).nth(index).click({ timeout: 3000, force: true })
	return state
}

// Подъём: башня отстраивается зигзагом, каждый блок остаётся там, где взят.
for (let i = 0; i < 7; i++) {
	if ((await board()).over) break
	if (i === 2) {
		// Верхняя точка дуги: прыжок перелетает площадку и опускается на неё.
		await pick(true)
		await page.waitForTimeout(210)
		await shot('06-jump')
		// Третий верный подряд — первая похвала за партию. Снимок берётся на
		// переезде: похвала висит секунду, ряд к этому времени ещё скрыт.
		await page.waitForTimeout(450)
		await shot('08-praise')
		await page.waitForTimeout(650)
		continue
	}
	if (!(await pick(true))) break
	// Ход теперь три такта: прыжок 340, пауза 120, переезд 520 — и только
	// потом выходит ряд.
	await page.waitForTimeout(1250)
	if (i === 5) await shot('07-climb-tower')
}

// Промах: плита под ногой рушится, и персонаж отвесно падает по той колонке, в
// которую прыгнул, пока его не поймает первая плита башни, — а не поймает
// никакая, так до самой земли. Снимок берётся уже в падении: прыжок к этому
// времени долетел (340 мс), ряд осыпается, а новый ещё не встал.
await pick(false)
await page.waitForTimeout(480)
await shot('11-miss')
await page.waitForTimeout(520)

// --------------------------------------------------------------- пауза ----
//
// Снимается раньше воды, а не после неё. Партия у самой воды живёт считанные
// секунды, и прежний порядок отдавал паузе то, что от неё оставалось: кадра
// не выходило вовсе, потому что к этому времени уже висел итог.
if (!(await has('.over'))) {
	await page.locator('.round').first().click()
	await page.waitForTimeout(700)
	await shot('13-pause')
	await page.locator('.btn--play').click()
	await page.waitForTimeout(700)
}

// ---------------------------------------------------------------- вода ----
//
// Единственное давление в игре и единственный проигрыш.
//
// Два разных дела в одном цикле, и оба нужны. Промахи тратят этажи — иначе
// запас в десяток сходит на нет дольше, чем длится весь прогон. А опрос между
// ними частый, потому что у самой воды запас проскакивает от трёх до нуля
// быстрее, чем длится один ход, и редкая выборка его пропускала.
let watered = false
for (let i = 0; i < 20 && !watered; i++) {
	if (!(await pick(false))) break
	for (let k = 0; k < 6; k++) {
		const state = await board()
		if (state.over) { watered = true; break }
		if (state.gap <= 2) {
			await shot('12-water')
			watered = true
			break
		}
		await page.waitForTimeout(230)
	}
}

// ---------------------------------------------------------------- итог ----
for (let i = 0; i < 28; i++) {
	if (await has('.over')) break
	if (!(await pick(false))) break
	await page.waitForTimeout(1250)
}
await page.waitForTimeout(1200)
if (await has('.over')) await shot('14-game-over')

// Перезапуск с итога. Снимка тут нет — есть проверка: «играть ещё»
// размонтирует доску и собирает её заново, и всё, что там осталось от прошлых
// правок, вылезает именно здесь. Один раз так и вылезло: ссылка на удалённый
// таймер в `onBeforeUnmount` роняла страницу, а прогон этого не видел, потому
// что снимал итог и уходил на главную, ни разу не нажав кнопку.
if (await has('.over')) {
	await page.locator('.over .again').click()
	await page.waitForTimeout(900)

	/*
	   Доска обязана подняться заново — и проверять это надо здесь, пока она и
	   должна стоять.

	   Проверка нужна отдельной строкой: клики по блокам идут с `force`, потому
	   что мир на доске едет и «стабильным» блок не бывает никогда, — а `force`
	   заодно снимает и проверку перекрытия. Без этой строки развалившийся
	   перезапуск выглядел бы успешным прогоном: карточка итога осталась бы
	   висеть, клики уходили бы в неё, а скрипт этого не заметил.
	*/
	const back = await page.evaluate(
		(sel) => ({ over: !!document.querySelector('.over'), cands: document.querySelectorAll(sel).length }),
		CAND
	)
	if (back.over || !back.cands) errors.push(`перезапуск не поднял доску: ${JSON.stringify(back)}`)

	for (let i = 0; i < 2; i++) {
		if (!(await pick(true))) break
		await page.waitForTimeout(800)
	}
	// И выход в меню посреди партии — второй способ размонтировать доску.
	if (!(await has('.over'))) {
		await page.locator('.round').first().click()
		await page.waitForTimeout(600)
		await page.locator('.btn--ghost').first().click()
		await page.waitForTimeout(900)
	}
}


// Главная после партии — рекорд уже начислен.
await home()
await shot('15-home-after-run')

errors.push(...(await page.evaluate(() => window.__errs || [])))
await browser.close()
console.log(JSON.stringify({ lang: LANG, shots, errors }, null, 1))
if (errors.length) process.exitCode = 1
