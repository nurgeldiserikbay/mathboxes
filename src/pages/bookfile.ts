import { SIGNS } from '@/utils/conts'
import { I_Exp, I_Exp_Sign } from '@/utils/types'

export function getParsedExp(sign: string, index: number): I_Exp {
	const range = getRange(index, sign)
	const exp = codeFunc(getExp(sign, range))
	const nums = exp.filter((item) => item.type === SIGNS.NUMBER)
	const hidedInd = randomInt(0, nums.length - 1)
	const hided = nums[hidedInd]
	return {
		raw: exp,
		answer: hided.order,
		options: getOptions(Number(hided.value), 4),
	}
}

export function getRange(index: number, sign: string): number[] {
	if (['+', '-'].includes(sign)) {
		if (index < 5) return [0, 10]
		if (index < 10) return [0, 50]
		if (index < 20) return [0, 100]
		if (index < 25) return [0, 200]
		if (index < 30) return [0, 400]
		if (index < 35) return [0, 500]
		if (index < 40) return [0, 800]
		if (index < 50) return [0, 1000]
		return [0, 9999]
	} else if (['*', '/'].includes(sign)) {
		if (index < 10) return [1, 10]
		if (index < 20) return [1, 20]
		if (index < 30) return [1, 50]
		if (index < 40) return [1, 80]
		if (index < 90) return [1, 100]
		if (index < 150) return [1, 200]
		return [0, 9999]
	} else if (['√'].includes(sign)) {
		if (index < 5) return [1, 10]
		if (index < 20) return [1, 100]
		if (index < 30) return [1, 300]
		if (index < 40) return [1, 500]
		if (index < 80) return [1, 1000]
		if (index < 150) return [1, 5000]
		return [0, 9999]
	} else if (['^'].includes(sign)) {
		// base min 2: base 0/1 makes several answers "correct" (ambiguous).
		if (index < 10) return [2, 10, 2, 2]
		if (index < 20) return [2, 10, 2, 3]
		if (index < 30) return [2, 20, 2, 3]
		if (index < 40) return [2, 50, 2, 3]
		// Cap at 100^3 (1e6); larger produced unreadable ~1e16 numbers.
		return [2, 100, 2, 3]
	} else if (['log'].includes(sign)) {
		// base min 2: base 0/1 makes log ambiguous.
		if (index < 10) return [2, 10, 2, 2]
		if (index < 20) return [2, 10, 2, 3]
		if (index < 30) return [2, 20, 2, 3]
		if (index < 40) return [2, 50, 2, 3]
		return [2, 100, 2, 3]
	}

	return [0, 100, 2, 2]
}

export function getOptions(target: number, count: number): number[] {
	const similarNumbers: number[] = [target]

	// Widen the search window if there aren't enough unique small candidates
	// so this loop can never spin forever (e.g. when target is very small).
	let spread = 10
	let guard = 0
	while (similarNumbers.length < count) {
		const offset = Math.floor(Math.random() * spread) + 1
		const variation = Math.random() < 0.5 ? -offset : offset
		const similar = target + variation

		if (similar > 0 && !similarNumbers.includes(similar)) {
			similarNumbers.push(similar)
		}

		if (++guard % 50 === 0) spread += 10
	}

	return similarNumbers.sort(() => (Math.random() < 0.5 ? -1 : 1))
}

export function codeFunc(exp: (string | number)[]): I_Exp_Sign[] {
	return exp.map((value, index) => ({
		type: !isNaN(+value) ? SIGNS.NUMBER : SIGNS.SIGN,
		order: index,
		value: value,
	}))
}

export function getExp(operator: string, range: number[]): (number | string)[] {
	const [min, max, minExp, maxExp] = range

	switch (operator) {
		case '+':
			return generateAddition(min, max)
		case '-':
			return generateSubtraction(min, max)
		case '*':
			return generateMultiplication(min, max)
		case '/':
			return generateDivision(min, max)
		case '^':
			return generateExponentiation(min, max, minExp, maxExp)
		case '√':
			return generateSquareRoot(min, max)
		case 'log':
			return generateLogarithm(min, max, minExp, maxExp)
		default:
			throw new Error('Unsupported operator')
	}
}

export function generateAddition(
	min: number,
	max: number
): (number | string)[] {
	const a = randomInt(min, max)
	const b = randomInt(min, max)
	const result = a + b
	return [a, '+', b, '=', result]
}

export function generateSubtraction(
	min: number,
	max: number
): (number | string)[] {
	const a = randomInt(min, max)
	const b = randomInt(min, a)
	const result = a - b
	return [a, '-', b, '=', result]
}

export function generateMultiplication(
	min: number,
	max: number
): (number | string)[] {
	const a = randomInt(min, max)
	const b = randomInt(min, max)
	const result = a * b
	return [a, '*', b, '=', result]
}

export function generateDivision(
	min: number,
	max: number
): (number | string)[] {
	const a = randomInt(min, max)
	const b = randomInt(min, max)
	const result = a * b
	return [result, '/', a, '=', b]
}

export function generateExponentiation(
	min: number,
	max: number,
	minExp: number,
	maxExp: number
): (number | string)[] {
	const base = randomInt(min, max)
	const exponent = randomInt(minExp, maxExp)
	const result = Math.pow(base, exponent)
	return [base, '^', exponent, '=', result]
}

export function generateSquareRoot(
	min: number,
	max: number
): (number | string)[] {
	const result = randomInt(min, max)
	const a = Math.pow(result, 2)
	return ['√', a, '=', result]
}

export function generateLogarithm(
	min: number,
	max: number,
	minExp: number,
	maxExp: number
): (number | string)[] {
	const base = randomInt(min, max)
	const exponent = randomInt(minExp, maxExp)
	const a = Math.pow(base, exponent)
	return ['log(', base, ')', a, '=', exponent]
}

export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

// Float-safe equality for sqrt/pow/log results (integers differ by >= 1).
function approxEqual(a: number, b: number): boolean {
	return Math.abs(a - b) < 1e-9
}

export function checkEquation(equation: string) {
	try {
		const [left, right] = equation.split('=')

		if (right === undefined) throw new Error('Invalid equation format')

		const expectedResult = parseFloat(right)

		if (left.includes('+')) {
			const [a, b] = left.split('+').map(Number)
			return a + b === expectedResult
		} else if (left.includes('-')) {
			const [a, b] = left.split('-').map(Number)
			return a - b === expectedResult
		} else if (left.includes('*')) {
			const [a, b] = left.split('*').map(Number)
			return a * b === expectedResult
		} else if (left.includes('/')) {
			const [a, b] = left.split('/').map(Number)
			return a / b === expectedResult
		} else if (left.includes('^')) {
			const [a, b] = left.split('^').map(Number)
			return approxEqual(Math.pow(a, b), expectedResult)
		} else if (left.startsWith('√')) {
			const a = parseFloat(left.slice(1))
			return approxEqual(Math.sqrt(a), expectedResult)
		} else if (left.startsWith('log(')) {
			const baseEndIndex = left.indexOf(')')
			const base = parseFloat(left.slice(4, baseEndIndex))
			const a = parseFloat(left.slice(baseEndIndex + 1))
			return approxEqual(Math.pow(base, expectedResult), a)
		} else {
			throw new Error('Unknown operation')
		}
	} catch (error) {
		console.error('Error while checking equation:', error)
		return false
	}
}
