/**
 * Убирает ландшафтные заплатки запуска, после того как их сгенерировал
 * `capacitor-assets`.
 *
 * Игра заблокирована в портрете — `android:screenOrientation="portrait"` в
 * манифесте, — то есть ни один из этих файлов не будет показан никогда.
 * Генератор об этом не знает и раскладывает заплатку на обе ориентации, по
 * тринадцать вариантов плотности в каждой: три с половиной мегабайта, которые
 * едут в бандл и в установку и не делают ничего.
 *
 * Удалять их безопасно: Android ищет ресурс от частного к общему и, не найдя
 * `drawable-land-<плотность>`, берёт `drawable/splash.png` — тот остаётся на
 * месте. Так же он поступает и на плотности, для которой файла нет.
 *
 * Запускается после `capacitor-assets generate` и до `cap sync`, иначе
 * следующая генерация просто положит их обратно.
 *
 *   node scripts/trim-splash.mjs
 */
import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

const RES = 'android/app/src/main/res'

let removed = 0
let freed = 0

let dirs
try {
	dirs = await readdir(RES, { withFileTypes: true })
} catch {
	// Нет папки ресурсов — значит нет и Android-проекта. Это не ошибка сборки.
	process.exit(0)
}

for (const entry of dirs) {
	if (!entry.isDirectory() || !entry.name.startsWith('drawable-land-')) continue
	const file = join(RES, entry.name, 'splash.png')
	try {
		freed += (await stat(file)).size
		await rm(file)
		removed += 1
		// Папка после этого пуста — и пустая папка ресурсов Gradle не нравится.
		const rest = await readdir(join(RES, entry.name))
		if (!rest.length) await rm(join(RES, entry.name), { recursive: true })
	} catch {
		// Файла нет — значит его уже убрали. Делать нечего.
	}
}

console.log(
	removed
		? `[trim-splash] ландшафтных заплаток убрано: ${removed}, освобождено ${(freed / 1048576).toFixed(1)} МБ`
		: '[trim-splash] убирать нечего'
)
