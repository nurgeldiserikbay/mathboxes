export type TYPE_PAGES = 'START' | 'PLAYGROUND'

/** Four operations, and only four. Powers, roots and logarithms are gone: the
 *  tower asks for an answer every two seconds, and an operation you have to
 *  stop and think about is an operation that breaks the climb. */
export type TYPE_OP = '+' | '-' | '*' | '/'

export interface I_OPERATION {
	id: number
	/** i18n key of the display name. */
	name: string
	sign: TYPE_OP
	/** Big glyph shown wherever the operation is named. */
	glyph: string
	description: string
	/** One solid accent; every shade in the UI is derived from it. */
	tint: string
}

/**
 * One floor of the tower: `a op b = ?`. Stored structurally, never as a string,
 * so an answer is checked by arithmetic instead of by re-parsing rendered text.
 * The blank is always the result — the player reads left to right and says
 * where it lands.
 */
export interface I_Question {
	op: TYPE_OP
	a: number
	b: number
	result: number
	options: number[]
	tier: number
	/** The chain could not continue and `a` is a fresh start, not the last result. */
	fresh: boolean
}

/** A floor as the tower holds it: the question plus what happened on it. */
export interface I_Floor {
	id: number
	/** Which floor of the tower this block is. The active one is `floor + 1`. */
	number: number
	question: I_Question
	/** Nothing has been picked yet — this is the block showing "?". */
	pending: boolean
	/** Answered right. A wrong answer still records the true result. */
	correct: boolean
	/** Checkpoint floor: it cannot burn. */
	safe: boolean
	/** Playing its collapse animation, on its way out of the array. */
	falling: boolean
}

export type TYPE_CHALLENGE = 'double' | 'shield' | 'bonus' | 'quick' | 'perfect'

/**
 * Что игрок выбрал на развилке. Действует до следующей опоры.
 *
 * Три двери — три разные оси, а не три оттенка безопасности:
 * `support` — опоры чаще (страховка от потери построенного),
 * `calm` — таймер длиннее (страховка от промаха по времени),
 * `rush` — числа выше и время короче в обмен на двойные очки.
 */
export type TYPE_BOON = 'support' | 'calm' | 'rush'

/** A small optional task running alongside the climb. Never a separate mode. */
export interface I_Challenge {
	kind: TYPE_CHALLENGE
	/** How many units of the goal are needed. */
	goal: number
	progress: number
}

/** A reward that lasts a while after its challenge is completed. */
export interface I_Buff {
	kind: TYPE_CHALLENGE
	/** Seconds left, for the timed ones; `null` when it lasts until used. */
	secondsLeft: number | null
}

export interface I_SessionSummary {
	score: number
	floor: number
	bestFloor: number
	correct: number
	wrong: number
	accuracy: number
	bestCombo: number
	topTier: number
	/** Safe floors reached in this run. */
	checkpoints: number
	challenges: number
	/** The floor beat the previous best. */
	isRecord: boolean
	previousBestFloor: number
	previousBestScore: number
}

/** Everything the game keeps between runs. Two numbers and two counters. */
export interface I_Records {
	bestFloor: number
	bestScore: number
	gamesPlayed: number
	totalCorrect: number
}
