import { I_Challenge, TYPE_CHALLENGE } from '@/utils/types'
import { pickOne } from '@/utils/mathEngine'

/**
 * Challenges. Small optional tasks that run alongside the climb — never a mode,
 * never a screen, never something the player has to accept. One line appears at
 * the top of the board, it fills up or it does not, and the game carries on.
 *
 * They are rare on purpose. A challenge that is always on is not a challenge,
 * it is a second HUD.
 */

/** Floors that must pass after one challenge ends before another may start. */
const COOLDOWN = 14
/** Nothing before this floor: the opening belongs to learning the loop. */
const FIRST_FLOOR = 8
/** Chance per floor once the cooldown is over. */
const CHANCE = 0.16

export const KINDS: TYPE_CHALLENGE[] = ['double', 'shield', 'bonus', 'quick', 'perfect']

/** How many units each challenge needs. */
const GOALS: { [key in TYPE_CHALLENGE]: number } = {
	double: 5,
	shield: 3,
	bonus: 5,
	quick: 3,
	perfect: 6,
}

/** An answer under this many milliseconds counts as quick. */
export const QUICK_MS = 2600

/** Seconds the double-score reward lasts. */
export const DOUBLE_SECONDS = 15
/** Flat rewards. */
export const BONUS_SCORE = 100
export const PERFECT_SCORE = 250
export const QUICK_SCORE = 150

export function makeChallenge(kind: TYPE_CHALLENGE): I_Challenge {
	return { kind, goal: GOALS[kind], progress: 0 }
}

/**
 * Whether a new challenge should appear now, and which one. `sinceLast` is the
 * number of floors climbed since the last one finished.
 */
export function rollChallenge(
	floor: number,
	sinceLast: number,
	exclude: TYPE_CHALLENGE | null,
	combo: number
): I_Challenge | null {
	if (floor < FIRST_FLOOR) return null
	if (sinceLast < COOLDOWN) return null
	if (Math.random() > CHANCE) return null

	// Never the same one twice running: two DOUBLE SCOREs in a row read as the
	// game being stuck rather than as a reward.
	let pool = KINDS.filter((kind) => kind !== exclude)
	// «Reach combo ×5» handed to a player already on ×9 is not a challenge, it is
	// a hundred points for turning up.
	if (combo >= GOALS.bonus - 2) pool = pool.filter((kind) => kind !== 'bonus')

	return makeChallenge(pickOne(pool))
}

export interface I_ChallengeTick {
	/** How much this answer moved the challenge on. */
	gained: number
	completed: boolean
	/** The mistake ended it. */
	failed: boolean
}

/**
 * Feeds one answer into the running challenge and returns what happened. The
 * challenge object is not mutated: the caller decides what to keep.
 */
export function advance(
	challenge: I_Challenge,
	outcome: { correct: boolean; combo: number; elapsedMs: number }
): { next: I_Challenge } & I_ChallengeTick {
	if (!outcome.correct) {
		// A mistake ends every challenge. It is the one rule they all share, and
		// it is what makes the streak worth protecting.
		return { next: challenge, gained: 0, completed: false, failed: true }
	}

	let progress = challenge.progress

	switch (challenge.kind) {
		case 'double':
		case 'shield':
		case 'perfect':
			progress += 1
			break
		case 'bonus':
			// Measured against the combo itself, not counted up: the goal is to
			// *reach* ×5, so a run already at ×4 is nearly there.
			progress = Math.min(challenge.goal, outcome.combo)
			break
		case 'quick':
			if (outcome.elapsedMs <= QUICK_MS) progress += 1
			break
	}

	const gained = progress - challenge.progress
	const completed = progress >= challenge.goal

	return {
		next: { ...challenge, progress: Math.min(challenge.goal, progress) },
		gained,
		completed,
		failed: false,
	}
}
