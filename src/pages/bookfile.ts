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

export function getRange(index: number, sign: string): [number, number] {
	if (['+', '-'].includes(sign)) {
		if (index < 5) return [0, 10]
		if (index < 20) return [0, 100]
		if (index < 30) return [0, 200]
		if (index < 40) return [0, 1000]
		return [0, 9999]
	} else if (['*', '/'].includes(sign)) {
		if (index < 5) return [0, 10]
		if (index < 20) return [0, 100]
		if (index < 30) return [0, 200]
		if (index < 40) return [0, 1000]
		return [0, 9999]
	} else if (['^', '√', 'ln'].includes(sign)) {
		if (index < 5) return [0, 10]
		if (index < 20) return [0, 100]
		if (index < 30) return [0, 200]
		if (index < 40) return [0, 1000]
		return [0, 9999]
	}

	return [0, 100]
}

export function getOptions(target: number, count: number): number[] {
	const similarNumbers: number[] = [target]

	while (similarNumbers.length < count) {
		const offset = Math.floor(Math.random() * 10) + 1
		const variation = Math.random() < 0.5 ? -offset : offset
		const similar = target + variation

		if (similar !== target) {
			similarNumbers.push(similar)
		}
	}

	return Array.from(similarNumbers).sort(() => (Math.random() < 0.5 ? -1 : 1))
}

export function codeFunc(exp: (string | number)[]): I_Exp_Sign[] {
	return exp.map((value, index) => ({
		type: !isNaN(+value) ? SIGNS.NUMBER : SIGNS.SIGN,
		order: index,
		value: value,
	}))
}

export function getExp(
	operator: string,
	range: [number, number]
): (number | string)[] {
	const [min, max] = range

	if (operator === '√') {
		const root = randomInt(
			Math.ceil(Math.sqrt(min)),
			Math.floor(Math.sqrt(max))
		)
		const square = root * root
		return ['√', square, '=', root]
	} else {
		const a = randomInt(min, max)
		const b = randomInt(min, max)

		let result

		switch (operator) {
			case '+':
				result = a + b
				break
			case '-':
				result = a - b
				break
			case '*':
				result = a * b
				break
			case '/':
				const divisor = randomInt(1, max)
				const dividend = divisor * randomInt(min, Math.floor(max / divisor))
				return [
					dividend.toString(),
					'/',
					divisor.toString(),
					'=',
					(dividend / divisor).toString(),
				]
			case '^':
				result = Math.pow(a, (b % 3) + 1)
				break
			case 'log':
				const lnInput = randomInt(1, max)
				return [
					'log',
					lnInput.toString(),
					'=',
					Math.floor(Math.log(lnInput)).toString(),
				]
			default:
				throw new Error('Unsupported operator')
		}

		return [a, operator, b, '=', result]
	}
}

export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min
}
