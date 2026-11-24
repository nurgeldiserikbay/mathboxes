// Снимает витрину Google Play: шесть кадров на каждое устройство и язык.
//
// Это не тот прогон, что make-page-screens.mjs. Тот снимает всё, что игрок
// может увидеть, включая паузу и промах, и нужен после каждой правки. Этот
// снимает то, что продаёт, и нужен перед выкладкой.
//
// Два отличия по существу:
//
// Соотношение у всех кадров ровно 9:16 — и у телефона, и у планшетов. Play
// требует именно 16:9 или 9:16, а не «не круче такого-то»: 1200×1920 и
// 1600×2560, которые лежали здесь от прежней версии, это 5:8, и их бы не
// приняли. Стороны в пределах 320…3840.
//
// Соотношение при этом не то же самое, что вьюпорт: планшетный кадр снимается
// планшетным вьюпортом и доводится до нужного размера плотностью. Подробности —
// у `DEVICES` ниже.
//
// Рекламная полоса скрыта. Она занимает верх экрана всегда, но на витрине
// показывать надо игру, а не место под объявление: так делают все, и правилам
// это не противоречит — скриншот обязан представлять приложение, а не его
// монетизацию.
//
// Нужен запущенный сервер:
//   node node_modules/vite/bin/vite.js --mode development --port 4236
// Затем из корня проекта:
//   node _docs/store/make-store-shots.mjs [порт]

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
const OUT = 'd:/WORK/completed/03-MathBoxes/_docs/store/screenshots/'

/**
 * Экраны съёмки.
 *
 * `width` и `height` — это вьюпорт в CSS-пикселях, то есть то, каким приложение
 * видит устройство; `scale` — плотность, то есть во сколько раз больше выходит
 * файл. Важны оба, и раньше здесь была ошибка именно в первом: планшеты
 * снимались вьюпортом 1080×1920, а такого не бывает ни у одного планшета —
 * десятидюймовый с экраном 1600×2560 при плотности 2 отдаёт приложению 800×1280.
 * Приложение честно раскладывалось на 1080 CSS-пикселей, и кадр показывал то,
 * чего на устройстве не увидеть.
 *
 * Теперь вьюпорты взяты у настоящих планшетов, а нужный размер файла набирается
 * плотностью. Соотношение у всех ровно 9:16, как требует Play, поэтому числа
 * подобраны так, чтобы умножение на `scale` давало целые стороны.
 */
const DEVICES = [
	{ dir: 'phone', width: 360, height: 640, scale: 3 }, //   1080×1920
	{ dir: 'tablet7', width: 720, height: 1280, scale: 2 }, // 1440×2560
	{ dir: 'tablet10', width: 810, height: 1440, scale: 2 }, // 1620×2880
]

const LANGS = ['ru', 'en']

/** Рекорд, с которым главная выглядит обжитой, а не пустой. */
const RECORDS = JSON.stringify({
	bestFloor: 42,
	bestScore: 24680,
	gamesPlayed: 31,
	totalCorrect: 517,
})

const GLYPH = {
	'+': (a, b) => a + b,
	'\u2212': (a, b) => a - b,
	'\u00d7': (a, b) => a * b,
	'\u00f7': (a, b) => a / b,
}
const CAND = '.block:not(.block--built):not(.block--ghost)'

const browser = await chromium.launch()
const errors = []
const made = []

/** Новая страница с засеянными настройками и скрытой рекламной полосой. */
async function open(device, lang, theme) {
	const page = await browser.newPage({
		viewport: { width: device.width, height: device.height },
		deviceScaleFactor: device.scale,
		locale: lang,
	})
	page.on('pageerror', (e) => errors.push(`${device.dir}/${lang}: ${e.message.slice(0, 160)}`))
	await page.addInitScript(
		([l, r, t]) => {
			localStorage.setItem('CapacitorStorage.lang', l)
			localStorage.setItem('CapacitorStorage.records4', r)
			localStorage.setItem('CapacitorStorage.name', 'Andrey')
			localStorage.setItem('CapacitorStorage.theme', t)
			// Полоса под баннер сворачивается в ноль: на витрине место под
			// объявление показывать нечего.
			document.documentElement.style.setProperty('--ad-slot', '0px')
		},
		[lang, RECORDS, theme]
	)
	await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
	await page.waitForTimeout(1500)
	return page
}

const board = (page) =>
	page.evaluate((sel) => ({
		expr: document.querySelector('.ask__expr')?.textContent.replace('= ?', '').trim() ?? '',
		vals: [...document.querySelectorAll(sel)].map((e) => Number(e.textContent.trim())),
		floor: Number(document.querySelector('.hud__height')?.textContent.trim() ?? 0),
		over: !!document.querySelector('.over'),
	}), CAND)

/** Один верный ход. Возвращает false, когда ходить больше нечем. */
async function answer(page, wait = 1250) {
	const state = await board(page)
	if (state.over) return false
	if (!state.vals.length) {
		await page.waitForTimeout(200)
		return true
	}
	const [a, sign, b] = state.expr.split(/\s+/)
	const want = GLYPH[sign]?.(Number(a), Number(b))
	let index = state.vals.indexOf(want)
	if (index < 0) index = 0
	// `force`: мир на доске оседает к воде каждый кадр, и «стабильным» блок не
	// бывает никогда.
	await page.locator(CAND).nth(index).click({ timeout: 3000, force: true })
	await page.waitForTimeout(wait)
	return true
}

async function shot(page, device, lang, name) {
	const dir = `${OUT}${device.dir}/${lang}/`
	fs.mkdirSync(dir, { recursive: true })
	await page.screenshot({ path: `${dir}${name}.png` })
	made.push(`${device.dir}/${lang}/${name}`)
}

for (const device of DEVICES) {
	for (const lang of LANGS) {
		// 1. Главная с рекордом.
		let page = await open(device, lang, 'city')
		await shot(page, device, lang, '1-home')

		// 2. Подъём в городе: башня уже видна, вода внизу.
		await page.locator('.big--play').click()
		await page.waitForTimeout(900)
		for (let i = 0; i < 4; i++) if (!(await answer(page))) break
		await shot(page, device, lang, '2-climb')

		// 3. Похвала за серию. Пятый верный подряд, снимок на переезде — надпись
		//    висит секунду, ряд к этому времени ещё скрыт.
		await answer(page, 700)
		await shot(page, device, lang, '3-streak')

		// 4. Итог. Сначала доигрываем до заметной высоты: кадр с «этаж 5» ничего
		//    не продаёт, а витрина должна показывать, чем игра может быть.
		for (let i = 0; i < 11; i++) if (!(await answer(page, 900))) break

		//    Потом просто перестаём отвечать, и вода делает своё.
		for (let i = 0; i < 60; i++) {
			if ((await board(page)).over) break
			await page.waitForTimeout(700)
		}
		await page.waitForTimeout(1400)
		await shot(page, device, lang, '6-result')
		await page.close()

		// 5. Зима с сосульками.
		page = await open(device, lang, 'winter')
		await page.locator('.big--play').click()
		await page.waitForTimeout(900)
		for (let i = 0; i < 4; i++) if (!(await answer(page))) break
		await shot(page, device, lang, '4-winter')
		await page.close()

		// 6. Каньон с лавой.
		page = await open(device, lang, 'canyon')
		await page.locator('.big--play').click()
		await page.waitForTimeout(900)
		for (let i = 0; i < 4; i++) if (!(await answer(page))) break
		await shot(page, device, lang, '5-lava')
		await page.close()
	}
}

console.log(JSON.stringify({ кадров: made.length, made, errors }, null, 1))
await browser.close()
if (errors.length) process.exitCode = 1
