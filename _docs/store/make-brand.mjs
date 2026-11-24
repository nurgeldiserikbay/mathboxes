// Собирает из двух исходников всё, что нужно сборке и витрине.
//
// Исходники лежат в `_docs/store/brand/` и правятся только руками: иконка и
// баннер нарисованы, а не сгенерированы кодом. Всё остальное — производные, и
// пересобирать их надо отсюда, а не резать по одному в редакторе: размеры
// Android и Play разъезжаются молча, и заметить это можно уже после выкладки.
//
//   node _docs/store/make-brand.mjs

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = 'd:/WORK/completed/03-MathBoxes'
const BRAND = path.join(ROOT, '_docs/store/brand')
const RES = path.join(ROOT, 'resources')
const UPLOAD = path.join(ROOT, '_docs/store/upload')

const ICON = path.join(BRAND, 'icon-source.png')
const BANNER = path.join(BRAND, 'banner-source.png')

fs.mkdirSync(UPLOAD, { recursive: true })

const made = []
const add = (file, note) => made.push({ файл: path.relative(ROOT, file).replace(/\\/g, '/'), note })

/** Средний цвет области, чтобы фон иконки не спорил с ней самой. */
async function averageColor(file, region) {
	const { data } = await sharp(file)
		.extract(region)
		.resize(1, 1, { fit: 'fill' })
		.raw()
		.toBuffer({ resolveWithObject: true })
	return `#${[data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const meta = await sharp(ICON).metadata()

// Небо берётся из самой картинки: сверху и чуть ниже середины. Подобранные
// вручную цвета разошлись бы с рисунком, как только его перерисуют.
const skyTop = await averageColor(ICON, {
	left: 0,
	top: 0,
	width: meta.width,
	height: Math.round(meta.height * 0.12),
})
const skyMid = await averageColor(ICON, {
	left: 0,
	top: Math.round(meta.height * 0.3),
	width: Math.round(meta.width * 0.18),
	height: Math.round(meta.height * 0.2),
})

/** Вертикальный градиент неба нужного размера. */
const skyTile = (size, top, bottom) =>
	Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
			<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
			</linearGradient></defs>
			<rect width="${size}" height="${size}" fill="url(#s)"/>
		</svg>`
	)

// ---------------------------------------------------------------- иконка ---

// Полная иконка. Альфа добавляется намеренно: Play принимает 32-битный PNG, а
// исходник пришёл без канала прозрачности.
await sharp(ICON)
	.resize(1024, 1024, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
	.ensureAlpha()
	.png()
	.toFile(path.join(RES, 'icon-only.png'))
add(path.join(RES, 'icon-only.png'), '1024×1024, для сборки')

// Передний слой адаптивной иконки — во весь холст, без запаса по краю.
//
// Обычное правило для адаптивной иконки — держать рисунок внутри центральных
// 66%: Android обрезает её кругом, каплей или скруглённым квадратом. Но здесь
// запас уже заложен в разметке. `mipmap-anydpi-v26/ic_launcher.xml`, который
// пишет capacitor-assets, оборачивает оба слоя в `<inset android:inset="16.7%">`
// — то есть сам вкладывает картинку ровно в видимую область. Свой запас поверх
// этого даёт двойное уменьшение: рисунок занимал 66% от видимого круга и
// выглядел наклейкой на синем диске. Проверяется это только сборкой значка из
// двух слоёв с маской, на самих файлах не видно.
await sharp(ICON)
	.resize(1024, 1024, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
	.ensureAlpha()
	.png()
	.toFile(path.join(RES, 'icon-foreground.png'))
add(path.join(RES, 'icon-foreground.png'), '1024×1024, во весь холст')

// Задний слой: только небо. При сплошном переднем слое его не видно, но
// разметка требует оба, и на случай, если рисунок когда-нибудь станет
// прозрачным по краям, фон должен быть тем же небом, а не чёрным.
await sharp(skyTile(1024, skyTop, skyMid)).png().toFile(path.join(RES, 'icon-background.png'))
add(path.join(RES, 'icon-background.png'), `1024×1024, небо ${skyTop} → ${skyMid}`)

// -------------------------------------------------------------- заплатка ---

// Значок по центру неба, а не рисунок во весь экран.
//
// Во весь экран выглядело богаче, но стоило непозволительно дорого: заплатка
// раскладывается на два десятка плотностей и ориентаций, и полноэкранный
// рисунок раздувал ресурсы Android до тридцати трёх мегабайт — при том что вся
// игра весит четыреста килобайт. Гладкое небо сжимается в сотни раз лучше, а
// заплатку видно меньше секунды.
const BADGE = 760
const badgeMask = Buffer.from(
	`<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE}" height="${BADGE}">
		<rect width="${BADGE}" height="${BADGE}" rx="${Math.round(BADGE * 0.23)}" fill="#fff"/>
	</svg>`
)

const badge = await sharp(ICON)
	.resize(BADGE, BADGE, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
	.composite([{ input: badgeMask, blend: 'dest-in' }])
	.png()
	.toBuffer()

const SPLASH = 2732
const centre = Math.round((SPLASH - BADGE) / 2)

await sharp(skyTile(SPLASH, skyTop, skyMid))
	.composite([{ input: badge, left: centre, top: centre }])
	.png()
	.toFile(path.join(RES, 'splash.png'))
add(path.join(RES, 'splash.png'), `${SPLASH}×${SPLASH}, значок ${BADGE}px на небе`)

await sharp(skyTile(SPLASH, '#1b2a52', '#101733'))
	.composite([{ input: badge, left: centre, top: centre }])
	.png()
	.toFile(path.join(RES, 'splash-dark.png'))
add(path.join(RES, 'splash-dark.png'), `${SPLASH}×${SPLASH}, тёмная тема`)

// ------------------------------------------------- витрина: значок и баннер ---

await sharp(ICON)
	.resize(512, 512, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
	.ensureAlpha()
	.png()
	.toFile(path.join(UPLOAD, 'icon-512.png'))
add(path.join(UPLOAD, 'icon-512.png'), 'иконка Play')

// Баннер. У исходника соотношение 2.049, у цели 2.048 — разница в десятую долю
// процента, поэтому `cover` ничего заметного не срежет, зато гарантирует, что
// картинку не растянет.
await sharp(BANNER)
	.resize(1024, 500, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
	.png()
	.toFile(path.join(UPLOAD, 'feature-graphic-1024x500.png'))
add(path.join(UPLOAD, 'feature-graphic-1024x500.png'), 'баннер Play')

// ------------------------------------------------------------ веб-версия ---

// Лицо PWA — та же игра, что и в APK, и выглядеть должно так же.
//
// Раньше эти файлы собирал отдельный скрипт, `make-icons.mjs`. Его удалили
// вместе со старым оформлением, а собранное им осталось: в `public/icons`
// лежала иконка позапрошлой версии — четыре коробки со знаками действий, — а в
// `public/screenshots` кадры игры, которой нет уже два переписывания. Из
// репозитория этого не видно никак: файлы не ломаются и в сборку попадают
// молча. Поэтому они собираются здесь, рядом со всем остальным.

const PUB = path.join(ROOT, 'public')

/** Размеры из манифеста и из `index.html`. Меняются только вместе с ними. */
const PWA_ICONS = [
	['favicon-16x16.png', 16],
	['favicon-32x32.png', 32],
	['apple-touch-icon.png', 180],
	['android-chrome-192x192.png', 192],
	['android-chrome-512x512.webp', 512],
	['icon-48.webp', 48],
	['icon-72.webp', 72],
	['icon-96.webp', 96],
	['icon-128.webp', 128],
	['icon-192.webp', 192],
	['icon-256.webp', 256],
	['icon-512.webp', 512],
]

for (const [name, size] of PWA_ICONS) {
	const image = sharp(ICON).resize(size, size, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
	await (name.endsWith('.webp') ? image.webp({ quality: 90 }) : image.png()).toFile(
		path.join(PUB, 'icons', name)
	)
}
add(path.join(PUB, 'icons'), `${PWA_ICONS.length} размеров значка`)

/**
 * `favicon.ico` — тот случай, когда формат проще собрать руками.
 *
 * sharp его не пишет, а тянуть ради одного файла зависимость не стоит. ICO же
 * с Vista умеет держать внутри обычные PNG: заголовок на шесть байт, по
 * шестнадцать на запись, дальше сами картинки. Три размера — столько же, сколько
 * было.
 */
const icoSizes = [16, 32, 48]
const icoImages = await Promise.all(
	icoSizes.map((size) => sharp(ICON).resize(size, size, { fit: 'cover' }).png().toBuffer())
)

const dir = Buffer.alloc(6 + 16 * icoSizes.length)
dir.writeUInt16LE(0, 0) // зарезервировано
dir.writeUInt16LE(1, 2) // тип: значок
dir.writeUInt16LE(icoSizes.length, 4)

let offset = dir.length
icoSizes.forEach((size, index) => {
	const at = 6 + index * 16
	dir.writeUInt8(size, at) // 0 означало бы 256
	dir.writeUInt8(size, at + 1)
	dir.writeUInt8(0, at + 2) // палитры нет
	dir.writeUInt8(0, at + 3)
	dir.writeUInt16LE(1, at + 4) // плоскостей
	dir.writeUInt16LE(32, at + 6) // бит на пиксель
	dir.writeUInt32LE(icoImages[index].length, at + 8)
	dir.writeUInt32LE(offset, at + 12)
	offset += icoImages[index].length
})

fs.writeFileSync(path.join(PUB, 'icons', 'favicon.ico'), Buffer.concat([dir, ...icoImages]))
add(path.join(PUB, 'icons/favicon.ico'), `${icoSizes.join(', ')} px`)

// Кадры для окна установки PWA. Берутся из тех же снимков, что уходят в Play —
// рисовать отдельные значило бы завести второй набор, который снова отстанет.
//
// 405×720 — ровно 9:16, как и исходные 1080×1920, поэтому `cover` здесь ничего
// не режет. Широких кадров нет намеренно: игра заблокирована в портрете, и
// показывать её лежащей на боку было бы неправдой.
const NARROW = ['1-home', '2-climb', '3-streak', '4-winter', '5-lava']
for (const [index, name] of NARROW.entries()) {
	await sharp(path.join(ROOT, '_docs/store/screenshots/phone/en', `${name}.png`))
		.resize(405, 720, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
		.webp({ quality: 82 })
		.toFile(path.join(PUB, 'screenshots', `narrow-${index + 1}.webp`))
}
add(path.join(PUB, 'screenshots'), `${NARROW.length} кадров 405×720`)

// ------------------------------------------------------ витрина: кадры ---

// Скриншоты переносятся как есть: они сняты с живой игры и трогать их нельзя.
const SHOTS = path.join(ROOT, '_docs/store/screenshots')
for (const device of ['phone', 'tablet7', 'tablet10']) {
	for (const lang of ['ru', 'en']) {
		const from = path.join(SHOTS, device, lang)
		if (!fs.existsSync(from)) continue
		const to = path.join(UPLOAD, `${device}-${lang}`)
		fs.mkdirSync(to, { recursive: true })
		for (const name of fs.readdirSync(from).sort()) {
			fs.copyFileSync(path.join(from, name), path.join(to, name))
		}
		add(to, `${fs.readdirSync(to).length} кадров`)
	}
}

console.log(JSON.stringify({ небо: [skyTop, skyMid], made }, null, 1))
