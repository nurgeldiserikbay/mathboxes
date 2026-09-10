import { I_Question, TYPE_OP } from '@/utils/types'

/**
 * Math engine — the only place that knows what a floor's equation may look like.
 *
 * Three rules drive everything here:
 *  1. A question is data (`a`, `b`, `result`), never a string. Answers are
 *     checked by arithmetic, so a rendered glyph can never change what counts
 *     as correct.
 *  2. Exactly one of the four options may satisfy the equation. Every candidate
 *     distractor is run through `verify` before it is offered.
 *  3. Every step is *continuable*. The next floor starts from the result of this
 *     one, so an operand is not drawn and then checked — it is derived from the
 *     running value, and only operations that can carry on from it are offered.
 */

const EPS = 1e-9
const MAX_VALUE = 999_999

export function randomInt(min: number, max: number): number {
	let lo = Math.ceil(min)
	let hi = Math.floor(max)
	if (!Number.isFinite(lo)) lo = 0
	if (!Number.isFinite(hi)) hi = lo
	if (hi < lo) {
		const tmp = lo
		lo = hi
		hi = tmp
	}
	return lo + Math.floor(Math.random() * (hi - lo + 1))
}

export function pickOne<T>(items: readonly T[]): T {
	return items[randomInt(0, items.length - 1)]
}

export function shuffle<T>(items: readonly T[]): T[] {
	const out = items.slice()
	for (let i = out.length - 1; i > 0; i--) {
		const j = randomInt(0, i)
		const tmp = out[i]
		out[i] = out[j]
		out[j] = tmp
	}
	return out
}

function nearlyEqual(x: number, y: number): boolean {
	return Math.abs(x - y) < EPS
}

/** Single source of truth for "is this equation true". */
export function verify(op: TYPE_OP, a: number, b: number, result: number): boolean {
	if (![a, b, result].every((value) => Number.isFinite(value))) return false

	switch (op) {
		case '+':
			return nearlyEqual(a + b, result)
		case '-':
			return nearlyEqual(a - b, result)
		case '*':
			return nearlyEqual(a * b, result)
		case '/':
			return b !== 0 && nearlyEqual(a / b, result)
		default:
			return false
	}
}

export function isCorrectAnswer(question: I_Question, value: number): boolean {
	return verify(question.op, question.a, question.b, value)
}

// ---------------------------------------------------------------------------
// Difficulty ladder
// ---------------------------------------------------------------------------

/**
 * Twelve steps. Two numbers decide how a step feels: how big the running value
 * is allowed to get, and how big the operand may be.
 *
 * Plus and minus are allowed to reach three digits, because `347 + 128` is a
 * question you can answer in four seconds. Times and divide never do: a big
 * product is not a harder question, it is the same question with more carrying,
 * and it costs twenty seconds nobody has. `mulA` is the ceiling on the *running
 * value* a multiplication may be offered from — this is what keeps the tower
 * from ever asking for `347 × 12`.
 */
export interface I_TierSpec {
	/** The running value may never leave `[1, ceiling]`. */
	ceiling: number
	/** Largest operand for `+` and `−`. */
	addMax: number
	/** Largest running value a `×` may start from. */
	mulA: number
	/** Largest factor. */
	mulB: number
	/** Largest divisor. */
	divB: number
	ops: TYPE_OP[]
}

const PLUS_MINUS: TYPE_OP[] = ['+', '-']
const PLUS_MINUS_TIMES: TYPE_OP[] = ['+', '-', '*']
const ALL: TYPE_OP[] = ['+', '-', '*', '/']

/**
 * The opening is deliberately tiny. The first floor has to be answerable before
 * the player has understood there is a game — `5 + 3`, and the tower moves.
 */
export const TIERS: I_TierSpec[] = [
	{ ceiling: 20, addMax: 9, mulA: 5, mulB: 3, divB: 3, ops: PLUS_MINUS },
	{ ceiling: 30, addMax: 12, mulA: 8, mulB: 4, divB: 4, ops: PLUS_MINUS_TIMES },
	{ ceiling: 50, addMax: 18, mulA: 11, mulB: 5, divB: 5, ops: ALL },
	{ ceiling: 80, addMax: 25, mulA: 15, mulB: 6, divB: 6, ops: ALL },
	{ ceiling: 120, addMax: 40, mulA: 19, mulB: 7, divB: 7, ops: ALL },
	{ ceiling: 200, addMax: 60, mulA: 24, mulB: 8, divB: 8, ops: ALL },
	{ ceiling: 300, addMax: 90, mulA: 30, mulB: 9, divB: 9, ops: ALL },
	{ ceiling: 450, addMax: 150, mulA: 36, mulB: 10, divB: 10, ops: ALL },
	{ ceiling: 600, addMax: 250, mulA: 42, mulB: 11, divB: 12, ops: ALL },
	{ ceiling: 800, addMax: 400, mulA: 50, mulB: 12, divB: 14, ops: ALL },
	{ ceiling: 999, addMax: 600, mulA: 66, mulB: 13, divB: 15, ops: ALL },
	{ ceiling: 999, addMax: 900, mulA: 90, mulB: 15, divB: 18, ops: ALL },
]

export const MAX_TIER = TIERS.length - 1

export function clampTier(tier: number): number {
	if (!Number.isFinite(tier)) return 0
	return Math.min(MAX_TIER, Math.max(0, Math.round(tier)))
}

export function tierSpec(tier: number): I_TierSpec {
	return TIERS[clampTier(tier)]
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

function swapLastDigits(value: number): number {
	const digits = String(Math.abs(value)).split('')
	if (digits.length < 2) return value
	const last = digits.length - 1
	const tmp = digits[last]
	digits[last] = digits[last - 1]
	digits[last - 1] = tmp
	return Number(digits.join(''))
}

/**
 * Distractors modelled on mistakes people actually make — the wrong operation,
 * off by one, a place-value slip, swapped digits — instead of noise around the
 * answer. That is what makes four options feel like a real question rather than
 * a guess with odds.
 */
function candidatePool(op: TYPE_OP, a: number, b: number, answer: number): number[] {
	const pool: number[] = []
	const add = (value: number) => {
		if (!Number.isInteger(value) || value < 0 || value > MAX_VALUE) return
		// Zero among three two-digit options is eliminated without reading it.
		if (value === 0 && answer > 3) return
		pool.push(value)
	}

	add(answer + 1)
	add(answer - 1)
	add(answer + 2)
	add(answer - 2)

	const magnitude = Math.abs(answer)
	if (magnitude >= 10) {
		add(answer + 10)
		add(answer - 10)
	}
	if (magnitude >= 100) {
		add(answer + 100)
		add(answer - 100)
		// On two digits this is not a slip, it is a different number: next to 16
		// the option 61 is discarded on sight, and a wasted option is a wasted
		// question.
		add(swapLastDigits(answer))
	}

	switch (op) {
		case '+':
			// Reading the sign the wrong way round.
			add(a - b)
			add(b - a)
			add(a + b + 10)
			break
		case '-':
			add(a + b)
			add(b - a)
			break
		case '*':
			// One row too many or too few in the times table, and plain addition.
			add(a * (b + 1))
			add(a * (b - 1))
			add(a + b)
			break
		case '/':
			add(a - b)
			add(b)
			add(Math.round(answer / 2))
			add(answer * 2)
			break
	}

	return pool
}

export function buildOptions(
	op: TYPE_OP,
	a: number,
	b: number,
	answer: number,
	tier: number,
	count = 4
): number[] {
	const distractors: number[] = []
	const seen = new Set<number>([answer])

	const accept = (value: number): boolean => {
		if (!Number.isInteger(value) || value < 0 || value > MAX_VALUE) return false
		if (seen.has(value)) return false
		// The hard guarantee: a distractor may never also solve the equation.
		if (verify(op, a, b, value)) return false
		seen.add(value)
		distractors.push(value)
		return true
	}

	const pool = candidatePool(op, a, b, answer)
	// From the middle of the ladder the near misses come first, which makes the
	// options harder to eliminate by eye; below that the spread keeps the choice
	// readable at a glance. With only one distractor there is no spread to keep:
	// a lone wild option turns the question into a formality, so it is always a
	// near miss.
	const ordered =
		tier >= 5 || count <= 2
			? pool.slice().sort((x, y) => Math.abs(x - answer) - Math.abs(y - answer))
			: shuffle(pool)

	for (const value of ordered) {
		if (distractors.length >= count - 1) break
		accept(value)
	}

	let spread = Math.max(3, Math.round(Math.abs(answer) * 0.14))
	for (let guard = 0; distractors.length < count - 1 && guard < 400; guard++) {
		const delta = randomInt(1, spread) * (Math.random() < 0.5 ? -1 : 1)
		accept(answer + delta)
		if (guard > 0 && guard % 40 === 0) spread *= 2
	}

	// Deterministic last resort so generation can never hang.
	for (let value = answer + 1; distractors.length < count - 1 && value <= answer + 5000; value++) {
		accept(value)
	}

	return shuffle([answer, ...distractors])
}

// ---------------------------------------------------------------------------
// The chain
// ---------------------------------------------------------------------------

interface Move {
	op: TYPE_OP
	b: number
	result: number
}

function divisors(value: number, maxDivisor: number): number[] {
	const out: number[] = []
	const top = Math.min(maxDivisor, value)
	for (let d = 2; d <= top; d++) {
		// A division whose answer is 1 is not a question.
		if (value % d === 0 && value / d >= 2) out.push(d)
	}
	return out
}

/**
 * The operand, drawn from the upper part of what the tier allows. Drawn flat,
 * `569 − 8` turns up as often as `569 − 240`, and it is not a question — the
 * tier says how big the numbers are, so the operand has to be worth its tier.
 */
function drawOperand(min: number, max: number, floorShare: number): number {
	if (max <= min) return Math.max(min, max)
	return randomInt(Math.max(min, Math.round(max * floorShare)), max)
}

/** Every legal next step from `carry` at this tier. */
function movesFrom(carry: number, spec: I_TierSpec): Move[] {
	const out: Move[] = []

	if (spec.ops.includes('+')) {
		const room = spec.ceiling - carry
		if (room >= 1) {
			const b = drawOperand(1, Math.min(spec.addMax, room), 0.2)
			out.push({ op: '+', b, result: carry + b })
		}
	}

	if (spec.ops.includes('-') && carry > 2) {
		const b = drawOperand(1, Math.min(spec.addMax, carry - 2), 0.2)
		out.push({ op: '-', b, result: carry - b })
	}

	if (spec.ops.includes('*') && carry >= 2 && carry <= spec.mulA) {
		const room = Math.floor(spec.ceiling / carry)
		if (room >= 2) {
			const b = drawOperand(2, Math.min(spec.mulB, room), 0.35)
			out.push({ op: '*', b, result: carry * b })
		}
	}

	if (spec.ops.includes('/')) {
		const options = divisors(carry, spec.divB)
		if (options.length) {
			// Same idea for the divisor: `÷ 2` on every other floor is not a range
			// of questions. The list is sorted, so the tail is the harder half.
			const from = Math.random() < 0.6 ? Math.floor(options.length * 0.4) : 0
			const b = pickOne(options.slice(from))
			out.push({ op: '/', b, result: carry / b })
		}
	}

	return out.filter(
		(move) =>
			Number.isInteger(move.result) &&
			// Never 1. Nothing can be divided out of it, subtracting from it goes
			// to zero, and the chain would have to restart on the next floor —
			// which is exactly the seam the chain exists to avoid.
			move.result >= 2 &&
			move.result <= spec.ceiling &&
			verify(move.op, carry, move.b, move.result)
	)
}

/**
 * Picking among the legal moves. A plain random choice drifts: plus and times
 * walk the value into the ceiling and then only minus and divide are ever legal,
 * so the chain turns into a staircase down. The weight pulls the value back
 * towards the middle of the band, which keeps all four operations in play, and
 * it leans away from repeating the operation the player just did.
 */
/** What undoes what. Used to stop the chain walking on the spot. */
const INVERSE: { [key in TYPE_OP]: TYPE_OP } = {
	'+': '-',
	'-': '+',
	'*': '/',
	'/': '*',
}

function weigh(move: Move, target: number, lastOp: TYPE_OP | null): number {
	const distance = Math.abs(move.result - target) / Math.max(1, target)
	let weight = 1 / (0.4 + distance)

	// Times and divide are the interesting ones and the rarest — their operands
	// have to fit, where a plus always does. Nudge them up so a run does not read
	// as a column of sums.
	if (move.op === '*' || move.op === '/') weight *= 1.5
	if (move.op === lastOp) weight *= 0.45
	// `12 ÷ 6 = 2` followed by `2 × 6 = 12` is two questions that are the same
	// question. The chain should go somewhere.
	if (lastOp && move.op === INVERSE[lastOp]) weight *= 0.5

	// A result with small factors keeps a division available on the next floor.
	if (move.result % 2 === 0 || move.result % 3 === 0) weight *= 1.15

	return weight
}

/**
 * Where the chain is being pulled to on this step. One fixed comfort value does
 * not work: high up the ladder the band that makes `347 + 128` possible is far
 * above the band where a multiplication still fits, so a single target either
 * keeps the running value too big for `×` ever to be legal, or too small for
 * plus and minus to use the three digits they are allowed. The target is drawn
 * per step instead, so the value roams — small enough for the times table most
 * of the time, occasionally out into the hundreds.
 */
function drawTarget(spec: I_TierSpec): number {
	// The low band sits on `mulA` itself rather than under it: pulled further
	// down the chain parks on single digits and a whole tier turns into
	// `8 × 2 = 16, 16 ÷ 2 = 8`. On the boundary, a multiplication is legal about
	// half the time and the numbers still belong to the tier.
	const low = Math.max(8, spec.mulA)
	const high = spec.ceiling * 0.5
	return Math.random() < 0.55 ? low : Math.max(low, high)
}

function chooseMove(moves: Move[], spec: I_TierSpec, lastOp: TYPE_OP | null): Move {
	const target = drawTarget(spec)
	const total = moves.reduce((sum, move) => sum + weigh(move, target, lastOp), 0)
	let ticket = Math.random() * total
	for (const move of moves) {
		ticket -= weigh(move, target, lastOp)
		if (ticket <= 0) return move
	}
	return moves[moves.length - 1]
}

/**
 * A value to found a new chain on. Numbers with small factors are the useful
 * shape: they leave a division open on the very next floor. Several candidates
 * are drawn and the one with the most legal continuations wins.
 */
export function chainSeed(tier: number): number {
	const spec = tierSpec(tier)
	const top = Math.max(4, Math.round(spec.ceiling * 0.45))

	let best = Math.min(12, top)
	let bestMoves = -1

	for (let attempt = 0; attempt < 8; attempt++) {
		const factor = randomInt(2, Math.max(2, Math.min(12, spec.divB)))
		const seed = Math.max(
			4,
			Math.min(top, factor * randomInt(2, Math.max(2, Math.floor(top / factor))))
		)
		const count = movesFrom(seed, spec).length
		if (count > bestMoves) {
			bestMoves = count
			best = seed
		}
		if (bestMoves >= spec.ops.length) break
	}

	return Math.max(2, Math.min(spec.ceiling, best))
}

/**
 * The next floor. Give it where the chain stands and it returns the equation
 * that moves it on. `fresh` says the chain had to start over — either because
 * there was nothing to continue from, or because a change of difficulty left
 * the running value outside the band this tier works in.
 */
export function nextQuestion(
	carry: number,
	tier: number,
	lastOp: TYPE_OP | null = null,
	optionCount = 4
): I_Question {
	const safeTier = clampTier(tier)
	const spec = tierSpec(safeTier)

	const usable = Number.isInteger(carry) && carry >= 2 && carry <= spec.ceiling
	let from = usable ? carry : chainSeed(safeTier)
	let fresh = !usable
	let moves = movesFrom(from, spec)

	for (let guard = 0; !moves.length && guard < 16; guard++) {
		from = chainSeed(safeTier)
		fresh = true
		moves = movesFrom(from, spec)
	}

	if (!moves.length) {
		const b = randomInt(1, Math.max(1, Math.min(spec.addMax, spec.ceiling - from)))
		moves = [{ op: '+', b, result: from + b }]
	}

	const move = chooseMove(moves, spec, fresh ? null : lastOp)

	return {
		op: move.op,
		a: from,
		b: move.b,
		result: move.result,
		options: buildOptions(move.op, from, move.b, move.result, safeTier, optionCount),
		tier: safeTier,
		fresh,
	}
}

export const GLYPHS: { [key in TYPE_OP]: string } = {
	'+': '+',
	'-': '−',
	'*': '×',
	'/': '÷',
}

/** The equation as the floor shows it, without the result. */
export function expressionText(question: I_Question): string {
	return `${question.a} ${GLYPHS[question.op]} ${question.b}`
}
