import { MAX_TIER, clampTier } from '@/utils/mathEngine'

/**
 * Difficulty engine.
 *
 * The floor number does *not* decide how hard a question is. Two players on
 * floor 40 can be a nine-year-old who got there on plus and minus and an adult
 * who has been dividing three-digit numbers since floor 12; tying difficulty to
 * height would bore one of them and lose the other.
 *
 * What decides it is the only honest signal there is: whether the player is
 * answering, and how fast. A confident run climbs the ladder. A shaky one is
 * held where it is. A bad one is walked back down — temporarily, and never all
 * the way to single digits, because being demoted to `3 + 4` after reaching
 * floor 60 reads as the game sneering.
 */

/** Answers kept. The run that has to be clean is read off the end of it. */
const WINDOW = 22

/**
 * The target the whole ladder is tuned around: an ordinary question should take
 * two to five seconds. Faster than that and the tier is too low for this player;
 * much slower and it is too high, even when the answer is right.
 */
const FAST_MS = 2500
const OK_MS = 4200
const SLOW_MS = 6500

/** A long pause is thinking, a very long one is the player looking away. */
const MAX_ELAPSED_MS = 15_000

/** What one answer is worth towards the next tier. Four in a row, answered at
 *  the pace the ladder is tuned for, is one step up. */
const GAIN_FAST = 0.3
const GAIN_OK = 0.2
const GAIN_SLOW = 0.1
const GAIN_CRAWL = 0.04

/** A mistake costs more than a correct answer earns — that is the brake. */
const LOSS = 0.55

/**
 * The tier only climbs off a clean sheet — no mistake at all in the last so many
 * answers. A softer gate settles the game around two answers in three, and two
 * in three is not a difficulty, it is a coin toss with arithmetic on it: the
 * hearts run out inside a minute and nobody sees floor thirty.
 *
 * How long the clean run has to be depends on how many answers were on offer,
 * because a clean run is worth less when there is less to choose from. Ten right
 * in a row out of four is long odds without knowing the sums; ten right in a row
 * out of two is one chance in a thousand, which sounds like a lot until a player
 * makes a thousand answers. Stretching the run for the smaller counts is what
 * keeps the *knowledge* the ladder demands the same whatever the board shows —
 * and it is what lets an easier board actually be easier, instead of the tier
 * quietly taking the help back the moment it lands.
 */
const CLEAN_RUN: { [options: number]: number } = { 2: 18, 3: 14, 4: 10 }

function cleanRunFor(options: number): number {
	return CLEAN_RUN[options] ?? 10
}

/** Below this over the whole window the tier is walked back, whatever the meter
 *  says. */
const DROP_ACCURACY = 0.55

/** How far a bad patch may push the tier below the run's own peak. */
const MAX_SETBACK = 3

/**
 * The opening of a run, as a ceiling on the tier per answer given. Whatever the
 * player can do, the first floors are single digits: floor 1 has to be solvable
 * before anyone has read a word of explanation, because there is none.
 */
const WARMUP = [0, 0, 1, 1, 2, 2, 3, 3, 4, 5]

export function warmupCap(answered: number): number {
	if (answered < WARMUP.length) return WARMUP[answered]
	// Then it keeps climbing a tier per answer until it meets what the run has
	// earned. Ending the warm-up outright made a cliff.
	return WARMUP[WARMUP.length - 1] + (answered - WARMUP.length + 1)
}

export interface I_Difficulty {
	/** What the run has earned. The question actually shown is also capped by
	 *  the warm-up, so this can be ahead of what is on screen. */
	tier: number
	/** Part-earned tier, −1…1. */
	progress: number
	/** The highest tier this run reached; the setback floor hangs off it. */
	peak: number
	/** Last outcomes, newest last. */
	recent: boolean[]
}

export function createDifficulty(): I_Difficulty {
	return { tier: 0, progress: 0, peak: 0, recent: [] }
}

function accuracy(recent: boolean[]): number {
	if (recent.length < 4) return 1
	const hits = recent.filter(Boolean).length
	return hits / recent.length
}

/** Nothing but correct answers for the last `need` of them. Early in a run,
 *  before there are that many, the player is given the benefit of the doubt —
 *  the warm-up is holding the tier down anyway. */
function isClean(recent: boolean[], need: number): boolean {
	const tail = recent.slice(-need)
	return tail.every(Boolean)
}

function gainFor(elapsedMs: number): number {
	if (elapsedMs <= FAST_MS) return GAIN_FAST
	if (elapsedMs <= OK_MS) return GAIN_OK
	if (elapsedMs <= SLOW_MS) return GAIN_SLOW
	return GAIN_CRAWL
}

export interface I_DifficultyStep {
	next: I_Difficulty
	/** −1 down a tier, 0 unchanged, 1 up a tier. */
	moved: -1 | 0 | 1
}

/** Feeds one answer in and returns the new state. Mutates nothing. */
export function feed(
	state: I_Difficulty,
	outcome: { correct: boolean; elapsedMs: number; options: number }
): I_DifficultyStep {
	const elapsed = Math.min(MAX_ELAPSED_MS, Math.max(0, outcome.elapsedMs))
	const recent = [...state.recent, outcome.correct].slice(-WINDOW)
	const rate = accuracy(recent)

	let tier = clampTier(state.tier)
	let progress = state.progress
	let peak = state.peak
	let moved: -1 | 0 | 1 = 0

	if (outcome.correct) {
		// Answering well but inaccurately is a player guessing their way up. Hold
		// them where they are until the run is clean again.
		progress += isClean(recent, cleanRunFor(outcome.options)) ? gainFor(elapsed) : 0
	} else {
		progress -= LOSS
		// A bad patch is walked back at once rather than waiting for the meter.
		if (rate < DROP_ACCURACY) progress -= LOSS
	}

	if (progress >= 1) {
		if (tier < MAX_TIER) {
			tier += 1
			progress = 0.12
			moved = 1
		} else {
			progress = 0.95
		}
	} else if (progress <= -1) {
		const floor = Math.max(0, peak - MAX_SETBACK)
		if (tier > floor) {
			tier -= 1
			moved = -1
		}
		// Reset either way: sitting at −1 would drop another tier on the very
		// next mistake, which is how a wobble becomes a collapse.
		progress = -0.15
	}

	peak = Math.max(peak, tier)

	return { next: { tier, progress, peak, recent }, moved }
}

/**
 * How many answers to offer, which is a difficulty decision like any other and
 * so lives here rather than in the board.
 *
 * Not everyone playing this came for the arithmetic. Someone who is struggling
 * does not need a fifth thing to read before they can answer — they need a way
 * through, and a coin they are allowed to flip. Someone who is cruising is here
 * for exactly the opposite: four near-misses that have to be told apart.
 *
 * So the count follows the tier, which is already the game's measure of how the
 * player is doing. It cannot flicker, because the tier itself moves at most one
 * step per answer and the bands are three tiers wide; and it costs the board
 * nothing, because the answers sit in one row whatever their number — only the
 * buttons get wider.
 */
export function optionsForTier(tier: number): number {
	const t = clampTier(tier)
	if (t <= 2) return 2
	if (t <= 5) return 3
	return 4
}

/** The tier the next question is actually built at. */
export function shownTier(state: I_Difficulty, answered: number): number {
	return clampTier(Math.min(state.tier, warmupCap(answered)))
}
