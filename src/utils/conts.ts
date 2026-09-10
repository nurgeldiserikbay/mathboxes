import { I_OPERATION, TYPE_CHALLENGE, TYPE_PAGES } from './types'

export const DEFAULT_NAME = 'Anonym'

export const PAGES: { [key in TYPE_PAGES]: TYPE_PAGES } = {
	START: 'START',
	PLAYGROUND: 'PLAYGROUND',
}

/**
 * Palette rule: one clear hue per operation, all at the same rough lightness so
 * none of them shouts over the others. Inside the tower these are barely used —
 * a floor takes the colour of its height, not of its operation — but the help
 * sheet and the logo still need one colour per sign.
 */
export const OPERATIONS: I_OPERATION[] = [
	{
		id: 0,
		name: 'addition',
		sign: '+',
		glyph: '+',
		description: 'addition_desc',
		tint: '#e07a4e',
	},
	{
		id: 1,
		name: 'subtraction',
		sign: '-',
		glyph: '−',
		description: 'subtraction_desc',
		tint: '#3fa89a',
	},
	{
		id: 2,
		name: 'multiplication',
		sign: '*',
		glyph: '×',
		description: 'multiplication_desc',
		tint: '#7b5fd6',
	},
	{
		id: 3,
		name: 'division',
		sign: '/',
		glyph: '÷',
		description: 'division_desc',
		tint: '#4faa6a',
	},
]

/** Neutral accent for surfaces that do not belong to one floor or operation. */
export const NEUTRAL_TINT = '#818cf8'

/* ------------------------------------------------------------------ rules -- */

export const START_LIVES = 3
export const MAX_LIVES = 3

/** Correct answers in a row that earn a heart back. */
export const LIFE_EVERY = 5
/** Given instead of the heart when all three are already lit. */
export const LIFE_BONUS_SCORE = 60

export const BASE_POINTS = 10
/** The combo stops multiplying here; beyond it the score would run away. */
export const COMBO_CAP = 10

/** i18n keys per challenge, kept next to the rules they belong to. */
export const CHALLENGE_TEXT: {
	[key in TYPE_CHALLENGE]: { goal: string; reward: string }
} = {
	double: { goal: 'ch_double_goal', reward: 'ch_double_reward' },
	shield: { goal: 'ch_shield_goal', reward: 'ch_shield_reward' },
	bonus: { goal: 'ch_bonus_goal', reward: 'ch_bonus_reward' },
	quick: { goal: 'ch_quick_goal', reward: 'ch_quick_reward' },
	perfect: { goal: 'ch_perfect_goal', reward: 'ch_perfect_reward' },
}
