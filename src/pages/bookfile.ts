import { SIGN_COMPLEXITY_ARR, SIGNS_TYPES } from '@/utils/conts'
import { evaluateExpression, generateMathEquation, getRandomInt } from '@/utils/helpers'

export interface ITimerObj {
	[key: number]: ReturnType<typeof setTimeout>
}

export interface ISign {
	id: number
	sign: string
	state: boolean
}

export type IExpresstion = ISign[]

export type IExpresstionOption = {
	value: IExpresstion
	complexity: number
	suggests: ISuggests[]
}

export interface ISuggests {
	id: number
	sign: string
}

export function getMaxNum(index: number) {
	if (index < 20) return 10
	else if (index < 30) return 50
	return 100
}

export function findEmptySymbols(
	start: number,
	expression: IExpresstion,
	answers: { [key: number]: ISuggests }
) {
	for (let i = start; i < expression.length; i += 1) {
		if (!expression[i].state && !answers[expression[i].id]) return i
	}
	for (let i = 0; i < start; i += 1) {
		if (!expression[i].state && !answers[expression[i].id]) return i
	}
	return -1
}

export function checkExp(expression: IExpresstion, answers: { [key: number]: ISuggests }) {
	return evaluateExpression(expression.map((exp) => {
		if (exp.state) return exp.sign
		else return answers[exp.id]?.sign
	}))
}

export function getExpOption(
	mainsign: SIGNS_TYPES[],
	signs: SIGNS_TYPES[],
  i: number,
	func?: () => string[]
): IExpresstionOption {
	const expression = func ? func() : generateMathEquation(mainsign, signs, {
		allowDecimals: false,
		decimalProbability: 0,
		numMax: getMaxNum(i),
	})
	const [hiddensCount, expresstionArray, hidedSymbols] =
		transformExpresstion(expression)
	const totalSum = expression
		.filter((sign) => !isNaN(+sign))
		.reduce((summ, sign) => {
			summ += +sign
			return summ
		}, 0)
	const suggests = genSuggestSymbols(
		[...mainsign, ...signs],
		totalSum,
		hidedSymbols
	)
	const expressionComplexity = calcExpComplexity(expression, hiddensCount)
	return {
		value: expresstionArray,
		complexity: expressionComplexity,
		suggests: suggests,
	}
}

export function genSuggestSymbols(
	signs: string[],
	totalSum: number,
	hidedSymbols: string[]
): ISuggests[] {
	const symbols: string[] = hidedSymbols
	const count = 8 - hidedSymbols.length
	for (let i = 0; i < count; i += 1) {
		if (Math.random() > 0.5) {
			symbols.push(signs[getRandomInt(0, signs.length - 1)])
		} else {
			symbols.push(String(getRandomInt(0, totalSum)))
		}
	}
	return shuffle(symbols).map((s, sInd) => ({
		id: sInd,
		sign: s,
	}))
}

export function shuffle<T>(arr: T[]): T[] {
	return arr.sort(() => (Math.random() > 0.5 ? 1 : -1))
}

export function transformExpresstion(
	expression: string[]
): [number, ISign[], string[]] {
	const hiddensCount = getRandomInt(1, Math.floor(expression.length / 2))
	const expresstionArray = expression?.map((symbol, symbolInd) => {
		return {
			id: symbolInd,
			sign: symbol,
			state: true,
		}
	})
	const hidedSymbols: string[] = []
	let i = 0
	do {
		const symbolIndex = getRandomInt(0, expression.length - 1)
		if (expresstionArray[symbolIndex].state) {
			hidedSymbols.push(expresstionArray[symbolIndex].sign)
			expresstionArray[symbolIndex].state = false
			i += 1
		}
	} while (i < hiddensCount)
	return [hiddensCount, expresstionArray, hidedSymbols]
}

export function calcExpComplexity(
	expression: string[],
	hiddensCount: number
): number {
	let comp = hiddensCount * 2
	SIGN_COMPLEXITY_ARR.forEach(([symbol, value]) => {
		comp += expression.filter((e) => e === symbol).length * value
	})
	const eqIndex = expression.findIndex((i) => i === '=')
	if (eqIndex > -1) {
		comp += Math.floor(
			Math.max(eqIndex, expression.length - eqIndex - 1) /
				Math.min(eqIndex, expression.length - eqIndex - 1)
		)
	}
	return comp
}

export function clearTimeOuts(timeouts: ITimerObj) {
	Object.values(timeouts).forEach((timeId) => clearTimeout(timeId))
}
