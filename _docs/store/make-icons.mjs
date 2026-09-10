// Пересобирает весь набор иконок из одной SVG-разметки: лаунчер Android
// (mipmap-*), иконки PWA в public/icons, иконку 512×512, экраны запуска
// (drawable*/splash.png) и графику функции для консоли Play. Правится этот
// файл, а не картинки.
//
// Запуск из корня проекта:
//   node _docs/store/make-icons.mjs

import sharp from 'file:///D:/WORK/completed/03-MathBoxes/node_modules/sharp/lib/index.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'

const ROOT = 'd:/WORK/completed/03-MathBoxes'

// The four operation tints straight from src/utils/conts.ts, so the icon and the
// game are the same palette.
const TINTS = { add: '#e07a4e', sub: '#3fa89a', mul: '#7b5fd6', div: '#4faa6a' }

// The ground everything stands on, straight from --ink-0 in src/style.scss. A
// white icon in front of a dark game reads as a different app.
const GROUND = '#100c24'

function shade(hex, amount) {
	const n = parseInt(hex.slice(1), 16)
	const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
	const r = clamp(((n >> 16) & 255) * amount)
	const g = clamp(((n >> 8) & 255) * amount)
	const b = clamp((n & 255) * amount)
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * One isometric box: a top face, a right face and the front face carrying the
 * glyph. Same geometry as CubeRube in the game — the icon has to look like the
 * thing the player sees when they open it.
 */
function box(x, y, size, tint, glyph) {
	const d = size * 0.26 // depth of the isometric offset
	const r = size * 0.14
	const front = tint
	const top = shade(tint, 1.18)
	const side = shade(tint, 0.72)

	return `
	<g transform="translate(${x} ${y})">
		<path d="M0 ${d} L${d} 0 L${size + d} 0 L${size} ${d} Z" fill="${top}" />
		<path d="M${size} ${d} L${size + d} 0 L${size + d} ${size} L${size} ${size + d} Z" fill="${side}" />
		<rect x="0" y="${d}" width="${size}" height="${size}" rx="${r}" fill="${front}" />
		<text x="${size / 2}" y="${d + size / 2}" font-family="Arial, Helvetica, sans-serif"
			font-size="${size * 0.62}" font-weight="700" fill="#ffffff"
			text-anchor="middle" dominant-baseline="central">${glyph}</text>
	</g>`
}

/**
 * `padding` is the share of the canvas left empty around the mark. Adaptive
 * icons need a lot of it: the launcher crops to a circle or a squircle and
 * anything in the outer 25 % can be cut.
 */
function icon(size, { background = GROUND, padding = 0.08, radius = 0 } = {}) {
	const inner = size * (1 - padding * 2)
	// A box draws into (cell + depth) square, and depth is 0.26 of the cell, so
	// two boxes plus the gap plus that overhang come to 2.4 cells in both axes.
	// Sizing on 2.26 let the right column and the top faces run off the canvas.
	const cell = inner / 2.4
	const gap = cell * 0.14
	const left = size * padding
	const top = size * padding

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
	${background === 'none' ? '' : `<rect width="${size}" height="${size}" rx="${radius}" fill="${background}" />`}
	${box(left, top, cell, TINTS.add, '+')}
	${box(left + cell + gap, top, cell, TINTS.sub, '−')}
	${box(left, top + cell + gap, cell, TINTS.mul, '×')}
	${box(left + cell + gap, top + cell + gap, cell, TINTS.div, '÷')}
</svg>`
}

async function png(svg, size, file) {
	await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(file)
}

async function webp(svg, size, file) {
	await sharp(Buffer.from(svg)).resize(size, size).webp({ quality: 90, effort: 6 }).toFile(file)
}

// ---------------------------------------------------------------- launcher --
const MIPMAPS = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
for (const [density, size] of Object.entries(MIPMAPS)) {
	const dir = `${ROOT}/android/app/src/main/res/mipmap-${density}`
	mkdirSync(dir, { recursive: true })
	await png(icon(size * 4, { padding: 0.08 }), size, `${dir}/ic_launcher.png`)
	await png(icon(size * 4, { padding: 0.12, radius: size * 2 }), size, `${dir}/ic_launcher_round.png`)
	// Adaptive: the foreground floats on a flat background, both inset by the
	// system, so the mark itself gets extra padding to survive the crop.
	await png(icon(size * 4, { background: 'none', padding: 0.18 }), size, `${dir}/ic_launcher_foreground.png`)
	await sharp({
		create: { width: size, height: size, channels: 4, background: GROUND },
	}).png().toFile(`${dir}/ic_launcher_background.png`)
}

// -------------------------------------------------------------------- pwa --
const WEBP = [48, 72, 96, 128, 192, 256, 512]
for (const size of WEBP) {
	await webp(icon(size * 2, { padding: 0.06 }), size, `${ROOT}/public/icons/icon-${size}.webp`)
}
await webp(icon(1024, { padding: 0.06 }), 512, `${ROOT}/public/icons/android-chrome-512x512.webp`)
await png(icon(768, { padding: 0.06 }), 192, `${ROOT}/public/icons/android-chrome-192x192.png`)
await png(icon(720, { padding: 0.06 }), 180, `${ROOT}/public/icons/apple-touch-icon.png`)
await png(icon(256, { padding: 0.04 }), 32, `${ROOT}/public/icons/favicon-32x32.png`)
await png(icon(128, { padding: 0.02 }), 16, `${ROOT}/public/icons/favicon-16x16.png`)

// ------------------------------------------------------------------ store --
mkdirSync(`${ROOT}/_docs/store`, { recursive: true })
await png(icon(1024, { padding: 0.06 }), 512, `${ROOT}/_docs/store/icon-512.png`)
writeFileSync(`${ROOT}/_docs/store/icon.svg`, icon(512, { padding: 0.06 }), 'utf8')

// Feature graphic: the mark, the name, one line of what it is.
const W = 1024
const H = 500
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
	<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#191140" />
			<stop offset="1" stop-color="#100c24" />
		</linearGradient>
	</defs>
	<rect width="${W}" height="${H}" fill="url(#bg)" />
	${box(96, 150, 92, TINTS.add, '+')}
	${box(214, 150, 92, TINTS.sub, '−')}
	${box(96, 268, 92, TINTS.mul, '×')}
	${box(214, 268, 92, TINTS.div, '÷')}
	<text x="400" y="228" font-family="Arial, Helvetica, sans-serif" font-size="86"
		font-weight="800" fill="#f1eeff" letter-spacing="2">Math Boxes</text>
	<text x="402" y="296" font-family="Arial, Helvetica, sans-serif" font-size="34"
		font-weight="600" fill="#a79ecf">Mental math, one box at a time</text>
</svg>`
await sharp(Buffer.from(feature)).png({ compressionLevel: 9 }).toFile(`${ROOT}/_docs/store/feature-graphic-1024x500.png`)

// ----------------------------------------------------------------- splash --
// Every density Capacitor laid down, regenerated at the size it already is: the
// old set was a neon mark on white, which flashed white before a dark game and
// no longer even matched the launcher icon.
const splashes = await readdir(`${ROOT}/android/app/src/main/res`, { withFileTypes: true })
let splashCount = 0
for (const entry of splashes) {
	if (!entry.isDirectory() || !entry.name.startsWith('drawable')) continue
	const file = `${ROOT}/android/app/src/main/res/${entry.name}/splash.png`
	let meta
	try {
		meta = await sharp(file).metadata()
	} catch {
		continue // no splash in this folder
	}

	const { width, height } = meta
	// The mark takes a third of the short side and sits dead centre.
	const mark = Math.round(Math.min(width, height) * 0.34)
	const plate = await sharp(Buffer.from(icon(mark * 3, { background: 'none', padding: 0.04 })))
		.resize(mark, mark)
		.png()
		.toBuffer()

	await sharp({ create: { width, height, channels: 4, background: GROUND } })
		.composite([{ input: plate, gravity: 'centre' }])
		.png({ compressionLevel: 9 })
		.toFile(file)
	splashCount += 1
}

console.log(`icons, feature graphic and ${splashCount} splash screens written`)
