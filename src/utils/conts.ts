export type PagesType = 'START' | 'LEVELS' | 'PLAYGROUND'

export type SIGNS_TYPES = '+' | '-' | '*' | '/' | '(' | ')' | '^' | '√' | 'log'

export const PAGES: { [key in PagesType]: PagesType } = {
	START: 'START',
	LEVELS: 'LEVELS',
	PLAYGROUND: 'PLAYGROUND',
}

export const LEVELS = [
	{
		id: 0,
		title: 'Base',
		definition: ['+', '-'],
	},
	{
		id: 1,
		title: 'Multiply',
		definition: ['*'],
	},
	{
		id: 2,
		title: 'Divide',
		definition: ['/'],
	},
	{
		id: 3,
		title: 'Brackets',
		definition: ['(', ')'],
	},
	{
		id: 4,
		title: 'Power',
		definition: ['^'],
	},
	{
		id: 5,
		title: 'Root',
		definition: ['√'],
	},
	{
		id: 6,
		title: 'Logarithm',
		definition: ['Log'],
	},
]

export const PAGES_CONST: { [key in PagesType]: number } = {
	START: 1,
	LEVELS: 3,
	PLAYGROUND: 5,
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
