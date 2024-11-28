export type TYPE_PAGES = 'START' | 'PLAYGROUND'
export type TYPE_TIMES = 'MIN' | 'MIN_3' | 'MIN_5'
export type TYPE_SIGN = 'NUMBER' | 'SIGN'

export interface I_LEVEL {
	id: number
	name: string
	sign: string
	description: string
	bgColor: string
	infoIcon: string
	mainColor: string
}

export interface I_GameStat {
	name: string
	score: number
	date: Date
}

export type I_GameStatLevel = {
	[key in TYPE_TIMES]: I_GameStat[]
}

export interface I_GameStats {
	[key: number]: I_GameStatLevel
}

export interface I_Exp_Sign {
	type: TYPE_SIGN
	order: number
	value: string | number
}

export interface I_Exp {
	raw: I_Exp_Sign[]
	answer: number
	options: number[]
}
