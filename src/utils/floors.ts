import { mix, rotateHue } from '@/utils/color'

/**
 * Floor system. Two things live here and nothing else: which floors cannot burn,
 * and what colour the tower is at a given height.
 */

/**
 * Built floors a mistake costs. Three blocks leave the board — the equation that
 * was got wrong, which was never a floor, and the two under it that were.
 */
export const BURN_FLOORS = 2

/**
 * Checkpoints thin out as the tower grows. Near the ground a safety net every
 * ten floors is what stops a new player from ever going backwards for long; at
 * floor 400 the same spacing would make a mistake meaningless.
 */
export function safeStep(floor: number, override?: number): number {
	// Игрок может сам попросить опоры чаще — это одна из дверей на развилке.
	// Тогда лестница высот не при чём: шаг задан.
	if (override) return override
	if (floor <= 50) return 10
	if (floor <= 200) return 20
	return 50
}

export function isSafeFloor(floor: number, override?: number): boolean {
	return floor > 0 && floor % safeStep(floor, override) === 0
}

/** The highest checkpoint at or below `floor`; 0 when there is none yet. */
export function lastSafeFloor(floor: number, override?: number): number {
	for (let value = Math.floor(floor); value > 0; value--) {
		if (isSafeFloor(value, override)) return value
	}
	return 0
}

/** The next checkpoint above `floor` — the thing the player is climbing towards. */
export function nextSafeFloor(floor: number, override?: number): number {
	const step = safeStep(floor + 1, override)
	const next = (Math.floor(floor / step) + 1) * step
	// Crossing a band boundary (50 → 60, 200 → 250) changes the step, so the
	// naive next multiple can land below the boundary it was computed from. With
	// an explicit step there are no bands to cross.
	return override || isSafeFloor(next) ? next : next + step
}

/**
 * Where a mistake leaves the player. Never through the checkpoint underneath —
 * standing on floor 51 you fall to 50 and no further, and the tower can never go
 * below the ground.
 */
export function floorAfterMiss(floor: number, override?: number): number {
	return Math.max(0, lastSafeFloor(floor, override), floor - BURN_FLOORS)
}

/* ------------------------------------------------------------------ zones -- */

/**
 * The climb as colour. Nothing new loads and no zone is announced — the tower
 * simply is a different colour fifty floors up, and the player notices they
 * have been somewhere.
 *
 * A stop every fifty floors is the whole balance of it. Spread further, the
 * hue moved so little per floor that a good run of thirty floors ended in the
 * same blue it started in and the journey was invisible; packed tighter, the
 * palette spins and the colour stops meaning height at all. At fifty, ten
 * floors are a noticeable shift and fifty are a different place — and the
 * stops are interpolated, so no two adjacent floors ever differ by a step the
 * eye can catch.
 */
const STOPS: { at: number; tint: string }[] = [
	{ at: 0, tint: '#35a7e8' }, // bright sky blue
	{ at: 50, tint: '#3d7ff0' }, // blue
	{ at: 100, tint: '#7a5cf0' }, // blue-violet
	{ at: 150, tint: '#a955e8' }, // violet
	{ at: 200, tint: '#e0559f' }, // violet turning warm
	{ at: 250, tint: '#f07a3d' }, // warm
	{ at: 300, tint: '#f5b83d' }, // gold
	{ at: 350, tint: '#45c977' }, // green — a new atmosphere
	{ at: 400, tint: '#31c4b8' }, // teal
	{ at: 450, tint: '#35a7e8' }, // and round to the start
]

const CYCLE = STOPS[STOPS.length - 1].at

/** The accent a given floor belongs to. */
export function floorTint(floor: number): string {
	const height = Math.max(0, floor) % CYCLE

	for (let index = 0; index < STOPS.length - 1; index++) {
		const from = STOPS[index]
		const to = STOPS[index + 1]
		if (height >= from.at && height <= to.at) {
			const span = to.at - from.at
			return mix(from.tint, to.tint, span ? (height - from.at) / span : 0)
		}
	}

	return STOPS[0].tint
}

/**
 * How far into the current zone the player is, 0…1. The backdrop uses it to
 * drift, so the room keeps changing even between the named stops.
 */
export function zoneProgress(floor: number): number {
	const height = Math.max(0, floor) % CYCLE
	for (let index = 0; index < STOPS.length - 1; index++) {
		const from = STOPS[index]
		const to = STOPS[index + 1]
		if (height >= from.at && height <= to.at) {
			const span = to.at - from.at
			return span ? (height - from.at) / span : 0
		}
	}
	return 0
}

/**
 * The colour of one brick.
 *
 * `floorTint` alone is the long journey: it moves a couple of degrees per floor,
 * which is right for the climb and useless for the stack, because four blocks on
 * screen at once come out the same colour and the tower reads as one flat slab.
 *
 * So the zone colour is turned a little further round the wheel for each floor,
 * on a triangle that swings one way and then back. Neighbouring bricks differ by
 * eleven degrees — enough to see, nowhere near enough to look striped — and
 * because the swing folds instead of wrapping there is no seam anywhere in the
 * tower.
 *
 * The swing is bounded so a brick never leaves the palette its height belongs
 * to. At ±36° it did: blue floors came out cyan, which is a different place from
 * the blue-violet room they were standing in. At ±22° blue stays blue through
 * indigo, and the warm floors stay between amber and rose. The period is short
 * to pay for the smaller swing — the step per floor is what has to stay visible,
 * not the width of the swing.
 */
const BRICK_PERIOD = 8
const BRICK_SWING = 22

/** 0 → 1 → 0 across one period, continuous at the fold. */
function triangle(floor: number): number {
	const half = BRICK_PERIOD / 2
	const t = ((Math.floor(floor) % BRICK_PERIOD) + BRICK_PERIOD) % BRICK_PERIOD
	return t <= half ? t / half : 2 - t / half
}

export function brickTint(floor: number): string {
	return rotateHue(floorTint(floor), (triangle(floor) - 0.5) * 2 * BRICK_SWING)
}

/** Index of the zone a floor sits in — a new number means a new atmosphere. */
export function zoneIndex(floor: number): number {
	const height = Math.max(0, floor) % CYCLE
	const cycles = Math.floor(Math.max(0, floor) / CYCLE)
	for (let index = STOPS.length - 2; index >= 0; index--) {
		if (height >= STOPS[index].at) return cycles * (STOPS.length - 1) + index
	}
	return cycles * (STOPS.length - 1)
}
