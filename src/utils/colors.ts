const COLORS = [
	'linear-gradient(135deg, #FFB3AB, #FF7D6B)',
	'linear-gradient(135deg, #FFD69C, #FFA455)',
	'linear-gradient(135deg, #FFE8A1, #FFCD58)',
	'linear-gradient(135deg, #A6F2BC, #4DD69C)',
	'linear-gradient(135deg, #A3DFFF, #5DBFF2)',
	'linear-gradient(135deg, #DAB0FF, #B784FF)',
	'linear-gradient(135deg, #FFBDAE, #FF846A)',
	'linear-gradient(135deg, #9CE8E0, #5AB9BA)',
]

export default COLORS

export function getRandomColors(ind: number, shift: number) {
	const order = (ind + shift) % COLORS.length
	return COLORS[order]
}
