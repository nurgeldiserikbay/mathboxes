/**
 * A score of `12373` is five digits the eye has to count. Grouped, it is a
 * number you read. A thin space rather than a comma or a dot: those two mean
 * opposite things depending on the language, and this game speaks six.
 */
const GROUP = ' '

export function groupDigits(value: number): string {
	if (!Number.isFinite(value)) return '0'
	const sign = value < 0 ? '-' : ''
	const digits = String(Math.abs(Math.round(value)))
	if (digits.length <= 4) return sign + digits

	let out = ''
	for (let i = digits.length; i > 0; i -= 3) {
		const start = Math.max(0, i - 3)
		out = digits.slice(start, i) + (out ? GROUP + out : '')
	}
	return sign + out
}
