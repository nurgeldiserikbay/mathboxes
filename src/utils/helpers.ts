import { SIGNS, SIGNS_TYPES } from './conts'

export function getRandomInt(max: number, min: number = 0) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateNumber(
	allowDecimals: boolean = false,
	probability: number = 0.5,
	max: number = 1000
) {
	let number = String(Math.floor(Math.random() * max) + 1)
	if (allowDecimals && Math.random() > probability) {
		const decimalPart = (Math.random() * Math.max(10, max / 10))
			.toFixed(0)
			.padStart(2, '0')
		number = `${number}.${decimalPart}`
	}
	return parseFloat(number)
}

export function getRandomOperator(operators: SIGNS_TYPES[]) {
	return operators[Math.floor(Math.random() * operators.length)]
}

export function createExpression(
	operators: SIGNS_TYPES[],
	allowDecimals: boolean,
	decimalProbability: number,
	numMax: number
) {
	const expressionParts: string[] = []
	const operandCount = Math.floor(Math.random() * 3) + 1

	for (let i = 0; i < operandCount; i++) {
		if (Math.random() > 0.6 && operators.includes('√')) {
			expressionParts.push(
				`√(${generateNumber(allowDecimals, decimalProbability, numMax)})`
			)
		} else if (Math.random() > 0.6 && operators.includes('log')) {
			expressionParts.push(
				`log(${generateNumber(allowDecimals, decimalProbability, numMax)})`
			)
		} else {
			expressionParts.push(
				generateNumber(allowDecimals, decimalProbability, numMax).toString()
			)
		}

		if (i < operandCount - 1) {
			expressionParts.push(getRandomOperator(operators))
		}
	}
	return expressionParts
}

export function evaluateExpression(expressionParts: (string | number)[]) {
	let expression = expressionParts.join(' ')
	expression = expression.replace(/\^/g, '**')
	expression = expression.replace(/√\(([^)]+)\)/g, 'Math.sqrt($1)')
	expression = expression.replace(/log\(([^)]+)\)/g, 'Math.log($1)')
	expression = expression.replace('=', '===')

	try {
		const value = Function(`return ${expression}`)()
		return value ? value : null
	} catch {
		return null
	}
}

export function generateMathEquation(
	requiredOperators: SIGNS_TYPES[],
	optionalOperators: SIGNS_TYPES[],
	options: {
		allowDecimals: boolean
		decimalProbability: number
		numMax: number
	} = {
		allowDecimals: false,
		decimalProbability: 0.5,
		numMax: 1000,
	}
): string[] {
	const { allowDecimals, decimalProbability, numMax } = options
	const operators = [
		...new Set([...requiredOperators, ...optionalOperators]),
	].filter((op) => SIGNS.includes(op))

	let leftExpressionParts: string[] = []
	let leftValue = null
	while (leftValue === null) {
		leftExpressionParts = createExpression(
			operators,
			allowDecimals,
			decimalProbability,
			numMax
		)
		leftValue = evaluateExpression(leftExpressionParts)
	}

	let rightExpressionParts = [leftValue.toString()]
	if (operators.length > 0) {
		rightExpressionParts = createExpression(
			operators,
			allowDecimals,
			decimalProbability,
			numMax
		)
		while (evaluateExpression(rightExpressionParts) !== leftValue) {
			rightExpressionParts = createExpression(
				operators,
				allowDecimals,
				decimalProbability,
				numMax
			)
		}
	}

	return [...leftExpressionParts, '=', ...rightExpressionParts]
}

export function generateAll(signs = SIGNS, numMax: number = 100) {
	return generateMathEquation([], signs, {
		allowDecimals: false,
		decimalProbability: 0.3,
		numMax: numMax,
	})
}

export function generateColors() {
	let colors = []
	for (let i = 0; i < 40; i++) {
		// 40 different hues
		let hue = i * (360 / 40) // evenly distributed hues
		for (let j = 0; j < 16; j++) {
			// 16 lightness variations
			let lightness = 30 + j * 4 // lightness from 30% to 90%
			colors.push(`hsl(${hue}, 50%, ${lightness}%)`)
		}
	}
	return colors
}
