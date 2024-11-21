import { evaluateExpression, getRandomInt } from './helpers'

export type PagesType = 'START' | 'PLAYGROUND'

export type SIGNS_TYPES = '+' | '-' | '*' | '/' | '(' | ')' | '^' | '√' | 'log'

export const PAGES: { [key in PagesType]: PagesType } = {
	START: 'START',
	PLAYGROUND: 'PLAYGROUND',
}

export const LEVELS = [
	{
		id: 0,
		title: 'Base',
		description: 'Base',
		mainsign: ['+', '-'],
		signs: [],
		background: 'linear-gradient(135deg, #FFB3AB, #FF7D6B)',
		positions: {
			top: '112px',
			left: '45px',
		},
		startStyle: {
			transform: `translate(-125.5px, -100.5px) scale(0.167) rotateX(20deg) rotateY(-10deg)`,
		},
		endStyle: {
			transform: `translate(-120px, -94px) scale(0.172) rotateX(0deg) rotateY(0deg)`,
		},
		generate() {
			const maxInt = 100
			const operators = ['+', '-']

			while (true) {
				const totalOperands = Math.floor(Math.random() * 3) + 3
				const leftOperandCount =
					Math.floor(Math.random() * (totalOperands - 1)) + 1
				const rightOperandCount = totalOperands - leftOperandCount

				const generateSide = (count: number) => {
					const side: string[] = [String(getRandomInt(maxInt))]
					for (let i = 1; i < count; i++) {
						const operator =
							operators[Math.floor(Math.random() * operators.length)]
						const operand = getRandomInt(maxInt)
						side.push(operator, String(operand))
					}
					return side
				}

				const leftSide = generateSide(leftOperandCount)
				const rightSide = generateSide(rightOperandCount)

				const leftValue = evaluateExpression(leftSide)
				const rightValue = evaluateExpression(rightSide)

				if (leftValue === rightValue) {
					return [...leftSide, '=', ...rightSide]
				}
			}
		},
	},
	{
		id: 1,
		title: 'Multiply',
		description: 'Multiplication',
		mainsign: ['*'],
		signs: ['+', '-'],
		background: 'linear-gradient(135deg, #FFD69C, #FFA455)',
		positions: {
			top: '112px',
			left: '165px',
		},
		startStyle: {
			transform: `translate(-5px, -100.5px) rotateX(20deg) rotateY(-10deg) scale(0.167)`,
		},
		endStyle: {
			transform: `translate(0px, -94px) scale(0.172) rotateX(0deg) rotateY(0deg)`,
		},
	},
	{
		id: 2,
		title: 'Divide',
		description: 'Division',
		mainsign: ['/'],
		signs: ['+', '-'],
		background: 'linear-gradient(135deg, #FFE8A1, #FFCD58)',
		positions: {
			top: '112px',
			left: '285px',
		},
		startStyle: {
			transform: `translate(115.5px, -100.5px) rotateX(20deg) rotateY(-10deg) scale(0.167)`,
		},
		endStyle: {
			transform: `translate(120px, -94px) scale(0.172) rotateX(0deg) rotateY(0deg)`,
		},
	},
	{
		id: 3,
		title: 'Bracket',
		description: 'Parentheses',
		mainsign: ['(', ')'],
		signs: ['+', '-'],
		background: 'linear-gradient(135deg, #A6F2BC, #4DD69C)',
		positions: {
			top: '240px',
			left: '45px',
		},
		startStyle: {
			transform: `translate(-125.5px, 27px) rotateX(20deg) rotateY(-10deg) scale(0.167)`,
		},
		endStyle: {
			transform: `translate(-120px, 32px) scale(0.172) rotateX(0deg) rotateY(0deg)`,
		},
	},
	{
		id: 4,
		title: 'Exponent',
		description: 'Exponents',
		mainsign: ['^'],
		signs: ['+', '-', '/', '*'],
		background: 'linear-gradient(135deg, #A3DFFF, #5DBFF2)',
		positions: {
			top: '240px',
			left: '165px',
		},
		startStyle: {
			transform: `translate(-5px, 27px) rotateX(20deg) rotateY(-10deg) scale(0.167)`,
		},
		endStyle: {
			transform: `translate(0px, 32px) scale(0.172) rotateX(0deg) rotateY(0deg)`,
		},
	},
	{
		id: 5,
		title: 'Root',
		description: 'Square Roots',
		mainsign: ['√'],
		signs: ['+', '-', '/', '*'],
		background: 'linear-gradient(135deg, #DAB0FF, #B784FF)',
		positions: {
			top: '240px',
			left: '285px',
		},
		startStyle: {
			transform: `translate(115.5px, 27px) rotateX(20deg) rotateY(-10deg) scale(0.167)`,
		},
		endStyle: {
			transform: `translate(120px, 32px) scale(0.172) rotateX(0deg) rotateY(0deg)`,
		},
	},
	{
		id: 6,
		title: 'Logarithm',
		description: 'Logarithm',
		mainsign: ['Log'],
		signs: ['+', '-', '/', '*'],
		background: 'linear-gradient(135deg, #FFBDAE, #FF846A)',
		positions: {
			top: '373px',
			left: '80px',
		},
		startStyle: {
			transform: `translate(-90px, 161px) rotateX(20deg) rotateY(-10deg) scale(0.167)`,
		},
		endStyle: {
			transform: `translate(-84px, 166px) scale(0.172) rotateX(0deg) rotateY(0deg)`,
		},
	},
	{
		id: 7,
		title: 'All',
		description: 'All',
		mainsign: [],
		signs: ['+', '-', '*', '/', '(', ')', '^', '√', 'Log'],
		background: 'linear-gradient(135deg, #9CE8E0, #5AB9BA)',
		positions: {
			top: '373px',
			left: '240px',
		},
		startStyle: {
			transform: `translate(70px, 161px) rotateX(20deg) rotateY(-10deg) scale(0.167)`,
		},
		endStyle: {
			transform: `translate(76px, 166px) scale(0.172) rotateX(0deg) rotateY(0deg)`,
		},
	},
]

export const PAGE_COUNT = 15

export const SIGNS: SIGNS_TYPES[] = [
	'+',
	'-',
	'*',
	'/',
	'(',
	')',
	'^',
	'√',
	'log',
]

export const SIGN_COMPLEXITY: { [key in SIGNS_TYPES]: number } = {
	'+': 1,
	'-': 1,
	'*': 2,
	'/': 2,
	')': 3,
	'(': 0,
	'^': 4,
	'√': 5,
	log: 6,
}

export const SIGN_COMPLEXITY_ARR = Object.entries(SIGN_COMPLEXITY)

export const SIGNS_DEF = {
	PLUS: SIGNS[0],
	MINUS: SIGNS[1],
	MULTI: SIGNS[2],
	DIVIDE: SIGNS[3],
	LEFT_BRACK: SIGNS[4],
	RIGTH_BRACK: SIGNS[5],
	POWER: SIGNS[6],
	ROOT: SIGNS[7],
	LOG: SIGNS[8],
}
