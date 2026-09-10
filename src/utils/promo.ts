/**
 * Наши же игры — то, что стоит в рекламном слоте, пока настоящего объявления
 * там нет.
 *
 * Зачем это вообще: слот под баннер зарезервирован всегда, иначе появление
 * рекламы сдвигает вёрстку. Но пустая полоса сверху — это потерянные пиксели и
 * вид сломанного экрана, поэтому в ней живёт кросс-промо: пока AdMob не отдал
 * объявление (не загрузился, нет заполнения, нет сети, или это вообще
 * веб-версия) — показываем одну из своих игр.
 *
 * В списке только те, что реально опубликованы: ссылка в никуда хуже, чем
 * отсутствие рекламы. Number Maze сюда не попал — его страницы в Play ещё нет.
 * Добавляя игру, проверьте, что её карточка открывается.
 */
export interface I_PromoGame {
	/** Имя файла иконки в `assets/promo` без расширения. */
	slug: string
	title: string
	appId: string
}

export const PROMO_GAMES: I_PromoGame[] = [
	{ slug: 'chessknightpuzzles', title: 'Chess Knight Puzzles', appId: 'com.thelightcome.chessknightpuzzles' },
	{ slug: 'mazeofmouse', title: 'Maze Of Mouse', appId: 'com.thelightcome.mazeofmouse' },
	{ slug: 'fruitopao', title: 'Fruito Pao', appId: 'com.thelightcome.fruitopao' },
	{ slug: 'bughunt', title: 'Bug Hunt', appId: 'com.thelightcome.bughunt' },
	{ slug: 'pianonotes', title: 'Piano Notes', appId: 'com.thelightcome.pianonotes' },
	{ slug: 'glasspuzzle', title: 'Glass Puzzle', appId: 'com.thelightcome.glasspuzzle' },
	{ slug: 'bubbledefense', title: 'Bubble Defense', appId: 'com.thelightcome.bubbledefense' },
	{ slug: 'fruitmatchpuzzle', title: 'Fruit Match Puzzle', appId: 'com.thelightcome.fruitmatchpuzzle' },
	{ slug: 'stackdrop', title: 'Stack Drop', appId: 'com.thelightcome.stackdrop' },
	{ slug: 'neocube', title: 'Neo Cube', appId: 'com.thelightcome.neocube' },
	{ slug: 'avoidbullets', title: 'Avoid Bullets', appId: 'com.thelightcome.avoidbullets' },
	{ slug: 'cutitright', title: 'Cut It Right', appId: 'com.thelightcome.cutitright' },
	{ slug: 'flowblocks', title: 'FlowBlocks', appId: 'com.thelightcome.flowblocks' },
]

/** Откуда пришёл переход — чтобы в консоли Play было видно, что это кросс-промо. */
const REFERRER = 'utm_source%3Dmathboxes%26utm_medium%3Dhouse_banner'

export function storeUrl(game: I_PromoGame): string {
	return `https://play.google.com/store/apps/details?id=${game.appId}&referrer=${REFERRER}`
}

/** Одна игра на сеанс показа. Случайно — чтобы за несколько партий игрок
 *  увидел разные, а не одну и ту же первую из списка. */
export function pickPromo(): I_PromoGame {
	return PROMO_GAMES[Math.floor(Math.random() * PROMO_GAMES.length)]
}
