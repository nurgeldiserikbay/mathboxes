/**
 * Локации: где идёт подъём и что ждёт внизу.
 *
 * Одна локация на партию. Раньше они сменялись по высоте — каждые двадцать
 * этажей новое небо и новая опасность, — и это было неправдой: высота в этой
 * игре означает рекорд, а не путешествие. Игрок не переходил из зимы в каньон,
 * он просто хорошо считал; связывать одно с другим значило обещать сюжет,
 * которого нет.
 *
 * Теперь место выбирается на старте — жребием или в настройках, — и держится
 * всю партию. Смена декораций стала тем, чем и была: сменой декораций.
 */

/** Что стоит внизу. Каждой — свой файл ряда в `assets/hazards`. */
export type TYPE_HAZARD = 'water' | 'spores' | 'ice' | 'lava'

export interface I_Location {
	/** Он же имя зоны неба: `assets/backdrops/<id>-far.svg` и `-near.svg`. */
	id: string
	/** Ключ перевода для настроек. */
	name: string
	hazard: TYPE_HAZARD
}

export const LOCATIONS: I_Location[] = [
	{ id: 'city', name: 'loc_city', hazard: 'water' },
	{ id: 'valley', name: 'loc_valley', hazard: 'spores' },
	{ id: 'winter', name: 'loc_winter', hazard: 'ice' },
	{ id: 'canyon', name: 'loc_canyon', hazard: 'lava' },
	{ id: 'night', name: 'loc_night', hazard: 'water' },
	{ id: 'space', name: 'loc_space', hazard: 'lava' },
]

/** Значение настройки «выбирать самому не буду». Оно же по умолчанию. */
export const THEME_RANDOM = 'random'

export function locationById(id: string): I_Location | null {
	return LOCATIONS.find((item) => item.id === id) ?? null
}

/**
 * Прошлая выпавшая локация.
 *
 * Живёт в модуле, а не в хранилище, намеренно: помнить её между запусками
 * приложения незачем, а вот два одинаковых места подряд в одной сессии игрок
 * замечает сразу и читает как «жребий сломался».
 */
let lastRolled = ''

/**
 * Где играть эту партию.
 *
 * `preference` — из настроек: идентификатор локации или `random`. Неизвестное
 * значение считается жребием: настройка могла прийти из версии, где локаций
 * было больше, и падать из-за этого игра не должна.
 */
export function resolveLocation(preference: string): I_Location {
	const picked = locationById(preference)
	if (picked) return picked

	const pool = LOCATIONS.filter((item) => item.id !== lastRolled)
	const from = pool.length ? pool : LOCATIONS
	const next = from[Math.floor(Math.random() * from.length)]
	lastRolled = next.id
	return next
}
