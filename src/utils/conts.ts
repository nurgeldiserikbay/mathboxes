import { generateMathEquation } from './helpers'

export type GAME_TYPE = 'CLASSIC' | 'FOR_SCORE'

export type PagesType = 'START' | 'LEVELTYPES' | 'LEVELS' | 'PLAYGROUND'

export type SIGNS_TYPES = '+' | '-' | '*' | '/' | '(' | ')' | '^' | '√' | 'log'

export const GAME_TYPES: { [key in GAME_TYPE]: GAME_TYPE } = {
	CLASSIC: 'CLASSIC',
	FOR_SCORE: 'FOR_SCORE',
}

export const PAGES: { [key in PagesType]: PagesType } = {
	START: 'START',
	LEVELTYPES: 'LEVELTYPES',
	LEVELS: 'LEVELS',
	PLAYGROUND: 'PLAYGROUND',
}

export const PAGES_CONST: { [key in PagesType]: number } = {
	START: 0,
	LEVELTYPES: 2,
	LEVELS: 4,
	PLAYGROUND: 6,
}

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
	'log': 6,
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

export const LEVELS = [
	{
		id: 1,
		title: 'Simple Arithmetic',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(['+', '-'], ['+', '-'], {
				allowDecimals: false,
				decimalProbability: 0.2,
				numMax: numMax,
			})
		},
	},
	{
		id: 2,
		title: 'Multiplication',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(['*'], ['+', '-'], {
				allowDecimals: false,
				decimalProbability: 0.2,
				numMax: numMax,
			})
		},
	},
	{
		id: 3,
		title: 'Division',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(['/'], ['+', '-'], {
				allowDecimals: false,
				decimalProbability: 0.5,
				numMax: numMax,
			})
		},
	},
	{
		id: 4,
		title: 'Brackets',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(['(', ')'], ['+', '-', '*', '/'], {
				allowDecimals: false,
				decimalProbability: 0.5,
				numMax: numMax,
			})
		},
	},
	{
		id: 5,
		title: 'Degree',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(['^'], ['+', '-', '*', '/', '(', ')'], {
				allowDecimals: false,
				decimalProbability: 0.5,
				numMax: numMax,
			})
		},
	},
	{
		id: 6,
		title: 'Root',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(['√'], ['+', '-', '*', '/', '(', ')', '^'], {
				allowDecimals: false,
				decimalProbability: 0.5,
				numMax: numMax,
			})
		},
	},
	{
		id: 7,
		title: 'Fractional numbers',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(
				['+', '-'],
				['+', '-', '*', '/', '(', ')', '^', '√'],
				{
					allowDecimals: true,
					decimalProbability: 0.5,
					numMax: numMax,
				}
			)
		},
	},
	{
		id: 8,
		title: 'Logarithms',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(
				['log'],
				['+', '-', '*', '/', '(', ')', '^', '√'],
				{
					allowDecimals: false,
					decimalProbability: 0.5,
					numMax: numMax,
				}
			)
		},
	},
	{
		id: 9,
		title: 'Complex polysemous expressions',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(
				['log'],
				['+', '-', '*', '/', '(', ')', '^', '√'],
				{
					allowDecimals: true,
					decimalProbability: 0.5,
					numMax: numMax,
				}
			)
		},
	},
	{
		id: 10,
		title: 'Expert mode',
		description: '',
		generate(numMax: number = 10) {
			return generateMathEquation(
				['log', '^', '√', '(', ')'],
				['+', '-', '*', '/', '(', ')', '^', '√', 'log'],
				{
					allowDecimals: true,
					decimalProbability: 0.5,
					numMax: numMax,
				}
			)
		},
	},
]
