<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { vOnClickOutside } from '@vueuse/components'
import { useAudio } from '@/composables/useAudio'

const i18n = useI18n()

const { playAudio } = useAudio()
const isActive = ref(false)

const locales = computed(() => {
	return i18n.availableLocales.sort((a, b) => a < b ? -1 : 1)
})

function selectLang(lang: string) {
	i18n.locale.value = lang
	isActive.value = false
}
</script>

<template>
	<div v-on-click-outside="() => (isActive = false)" class="langs">
		<template v-for="locale in locales" :key="locale">
			<div
				:class="{ 'langs__item--active': locale === i18n.locale.value }"
				class="langs__item"
				@click="playAudio('click', true), selectLang(locale)"
			>
				{{ locale }}
			</div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.langs {
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
	gap: 10px;

	&__item {
		padding: 10px 20px;
		border: 1px solid #020202;
		border-radius: 10px;
		cursor: pointer;
		transition: 300ms;
		font-size: 20px;
		font-weight: bold;
		text-transform: uppercase;

		&--active {
			color: #ffffff;
			background: linear-gradient(
				to bottom,
				rgba(1, 158, 219, 1),
				rgba(0, 78, 139, 1)
			);
			border: 1px solid rgba(255, 255, 255, 0.2);
		}
	}
}
</style>
