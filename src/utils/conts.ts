import { I_LEVEL, TYPE_PAGES, TYPE_SIGN, TYPE_TIMES } from './types'

export const DEFAULT_NAME = 'Anonym'

export const PAGES: { [key in TYPE_PAGES]: TYPE_PAGES } = {
	START: 'START',
	PLAYGROUND: 'PLAYGROUND',
}

export const TIMES: { [key in TYPE_TIMES]: TYPE_TIMES } = {
	MIN: 'MIN',
	MIN_3: 'MIN_3',
	MIN_5: 'MIN_5',
}

export const LEVELS: I_LEVEL[] = [
	{
		id: 0,
		name: 'addition',
		sign: '+',
		description: 'addition_desc',
		bgColor:
			'linear-gradient(to bottom, rgba(255, 120, 120, 1), rgba(255, 190, 120, 1))',
		infoIcon: 'rgba(80, 190, 255, 1)',
		mainColor: 'rgba(255, 190, 120, 1)',
	},
	{
		id: 1,
		name: 'subtraction',
		sign: '-',
		description: 'subtraction_desc',
		bgColor:
			'linear-gradient(to bottom, rgba(120, 255, 150, 1), rgba(80, 190, 255, 1))',
		infoIcon: 'rgba(180, 90, 255, 1)',
		mainColor: 'rgba(80, 190, 255, 1)',
	},
	{
		id: 2,
		name: 'multiplication',
		sign: '*',
		description: 'multiplication_desc',
		bgColor:
			'linear-gradient(to bottom, rgba(80, 90, 255, 1), rgba(180, 90, 255, 1))',
		infoIcon: 'rgba(20, 170, 50, 1)',
		mainColor: 'rgba(180, 90, 255, 1)',
	},
	{
		id: 3,
		name: 'division',
		sign: '/',
		description: 'division_desc',
		bgColor:
			'linear-gradient(to bottom, rgba(100, 250, 120, 1), rgba(20, 170, 50, 1))',
		infoIcon: 'rgba(255, 200, 70, 1)',
		mainColor: 'rgba(20, 170, 50, 1)',
	},
	{
		id: 4,
		name: 'exponent',
		sign: '^',
		description: 'exponent_desc',
		bgColor:
			'linear-gradient(to bottom, rgba(255, 90, 50, 1), rgba(255, 200, 70, 1))',
		infoIcon: 'rgba(0, 100, 200, 1)',
		mainColor: 'rgba(255, 200, 70, 1)',
	},
	{
		id: 5,
		name: 'square_root',
		sign: '√',
		description: 'square_root_desc',
		bgColor:
			'linear-gradient(to bottom, rgba(0, 200, 255, 1), rgba(0, 100, 200, 1))',
		infoIcon: 'rgba(120, 90, 255, 1)',
		mainColor: 'rgba(0, 100, 200, 1)',
	},
	{
		id: 6,
		name: 'logarithm',
		sign: 'log',
		description: 'logarithm_desc',
		bgColor:
			'linear-gradient(to bottom, rgba(255, 90, 120, 1), rgba(120, 90, 255, 1))',
		infoIcon: 'rgba(190, 50, 200, 1)',
		mainColor: 'rgba(120, 90, 255, 1)',
	},
	{
		id: 7,
		name: 'all',
		sign: '...',
		description: 'all_desc',
		bgColor:
			'linear-gradient(to bottom, rgba(255, 70, 150, 1), rgba(190, 50, 200, 1))',
		infoIcon: 'rgba(255, 190, 120, 1)',
		mainColor: 'rgba(190, 50, 200, 1)',
	},
]

export const SIGNS: { [key in TYPE_SIGN]: TYPE_SIGN } = {
	NUMBER: 'NUMBER',
	SIGN: 'SIGN',
}
