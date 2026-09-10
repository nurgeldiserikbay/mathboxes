/**
 * Small colour helpers. Every accent in the game is stored as one solid hex and
 * the shades are derived here, so a cube's three visible faces always belong to
 * the same colour instead of being hand-picked gradients.
 */

function clamp255(value: number): number {
	return Math.min(255, Math.max(0, Math.round(value)))
}

export function parseHex(hex: string): [number, number, number] {
	let clean = hex.trim().replace('#', '')
	if (clean.length === 3) {
		clean = clean
			.split('')
			.map((char) => char + char)
			.join('')
	}
	const value = Number.parseInt(clean, 16)
	if (!Number.isFinite(value) || clean.length !== 6) return [128, 128, 128]
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function toHex(rgb: [number, number, number]): string {
	return (
		'#' +
		rgb
			.map((channel) => clamp255(channel).toString(16).padStart(2, '0'))
			.join('')
	)
}

/** `amount` 0…1 towards white. */
export function lighten(hex: string, amount: number): string {
	const [r, g, b] = parseHex(hex)
	return toHex([
		r + (255 - r) * amount,
		g + (255 - g) * amount,
		b + (255 - b) * amount,
	])
}

/** `amount` 0…1 towards black. */
export function darken(hex: string, amount: number): string {
	const [r, g, b] = parseHex(hex)
	return toHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)])
}

export function alpha(hex: string, value: number): string {
	const [r, g, b] = parseHex(hex)
	return `rgba(${r}, ${g}, ${b}, ${value})`
}

/** Pulls a colour towards its own grey. `amount` 0…1. */
export function desaturate(hex: string, amount: number): string {
	const [r, g, b] = parseHex(hex)
	const grey = 0.299 * r + 0.587 * g + 0.114 * b
	return toHex([
		r + (grey - r) * amount,
		g + (grey - g) * amount,
		b + (grey - b) * amount,
	])
}

/** Perceived brightness 0…1, used to decide black or white lettering. */
export function luminance(hex: string): number {
	const [r, g, b] = parseHex(hex)
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function readableOn(hex: string): string {
	return luminance(hex) > 0.62 ? '#1a202c' : '#ffffff'
}

/**
 * Hue, saturation and lightness, 0…360 and 0…1. Needed because turning a colour
 * a few degrees round the wheel is not something `mix`, `lighten` or `darken`
 * can do: they all move towards or away from a fixed point, and what the tower
 * needs is to move *along* the spectrum without changing how bright or how
 * strong the colour is.
 */
export function toHsl(hex: string): [number, number, number] {
	const [r255, g255, b255] = parseHex(hex)
	const r = r255 / 255
	const g = g255 / 255
	const b = b255 / 255

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const l = (max + min) / 2
	const span = max - min

	if (span === 0) return [0, 0, l]

	const s = l > 0.5 ? span / (2 - max - min) : span / (max + min)
	let h: number
	if (max === r) h = ((g - b) / span + (g < b ? 6 : 0)) / 6
	else if (max === g) h = ((b - r) / span + 2) / 6
	else h = ((r - g) / span + 4) / 6

	return [h * 360, s, l]
}

export function fromHsl(h: number, s: number, l: number): string {
	const hue = (((h % 360) + 360) % 360) / 360
	const sat = Math.min(1, Math.max(0, s))
	const lig = Math.min(1, Math.max(0, l))

	if (sat === 0) {
		const grey = lig * 255
		return toHex([grey, grey, grey])
	}

	const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat
	const p = 2 * lig - q

	const channel = (t: number): number => {
		let value = t
		if (value < 0) value += 1
		if (value > 1) value -= 1
		if (value < 1 / 6) return p + (q - p) * 6 * value
		if (value < 1 / 2) return q
		if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6
		return p
	}

	return toHex([
		channel(hue + 1 / 3) * 255,
		channel(hue) * 255,
		channel(hue - 1 / 3) * 255,
	])
}

/** Turns a colour `degrees` round the wheel, keeping its weight. */
export function rotateHue(hex: string, degrees: number): string {
	const [h, s, l] = toHsl(hex)
	return fromHsl(h + degrees, s, l)
}

/** Blends two colours. `t` 0 → `from`, 1 → `to`. */
export function mix(from: string, to: string, t: number): string {
	const ratio = Math.min(1, Math.max(0, t))
	const [r1, g1, b1] = parseHex(from)
	const [r2, g2, b2] = parseHex(to)
	return toHex([r1 + (r2 - r1) * ratio, g1 + (g2 - g1) * ratio, b1 + (b2 - b1) * ratio])
}
