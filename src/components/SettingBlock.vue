<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'

import AppIcon from '@/components/AppIcon.vue'

import { useGameStore } from '@/store/gameStore'
import { useAudio } from '@/composables/useAudio'

import LangSelect from '@/components/LangSelect.vue'
import ThemeSelect from '@/components/ThemeSelect.vue'
import ModalSheet from '@/components/ModalSheet.vue'

const { playAudio, audioActive, vibroActive, toggleAudio, toggleVibro, vibrate } =
	useAudio()
const gameStore = useGameStore()

const $props = defineProps<{ open: boolean }>()
const $emits = defineEmits(['close'])

const name = ref('')

onMounted(() => {
	name.value = gameStore.name
})

// Keep the field in step with the name edited on the result screen.
watch(
	() => gameStore.name,
	(value) => {
		if (!$props.open) name.value = value
	}
)

watch(
	() => $props.open,
	(value) => {
		if (value) name.value = gameStore.name
	}
)

function close() {
	// Saving on close means a typed name is never lost by tapping the backdrop.
	if (name.value.trim() && name.value.trim() !== gameStore.name) {
		gameStore.setName(name.value)
	}
	name.value = gameStore.name
	$emits('close')
}

function change(event: Event) {
	const target = event.target as HTMLInputElement
	if (!target) return
	if (target.value.length > 12) target.value = target.value.slice(0, 12)
	name.value = target.value
}

function onToggleSound() {
	toggleAudio()
	// Played after enabling so the change is audible straight away.
	if (audioActive.value) playAudio('click')
}

function onToggleVibro() {
	toggleVibro()
	if (vibroActive.value) vibrate('tap')
}
</script>

<template>
	<div class="settings">
		<ModalSheet
			v-if="open"
			:title="$t('settings')"
			icon="gear"
			:action-label="$t('save')"
			@close="close"
		>
			<div class="group">
				<div class="group__label">{{ $t('player_name') }}</div>
				<div class="field">
					<input
						:value="name"
						type="text"
						class="field__input"
						maxlength="12"
						:placeholder="$t('player_name')"
						@input="change"
						@keyup.enter="close"
					/>
					<span class="field__count">{{ name.length }}/12</span>
				</div>
			</div>

			<div class="group">
				<div class="group__label">{{ $t('sound_and_vibro') }}</div>
				<div class="toggles">
					<button
						class="toggle"
						:class="{ 'is-on': audioActive }"
						type="button"
						:aria-pressed="audioActive"
						@click="onToggleSound"
					>
						<AppIcon :name="audioActive ? 'sound-on' : 'sound-off'" :size="24" class="toggle__icon" />
						<span class="toggle__name">{{ $t('sound') }}</span>
						<span class="toggle__state">{{ audioActive ? $t('on') : $t('off') }}</span>
					</button>
					<button
						class="toggle"
						:class="{ 'is-on': vibroActive }"
						type="button"
						:aria-pressed="vibroActive"
						@click="onToggleVibro"
					>
						<AppIcon name="vibration" :size="24" class="toggle__icon" />
						<span class="toggle__name">{{ $t('vibration') }}</span>
						<span class="toggle__state">{{ vibroActive ? $t('on') : $t('off') }}</span>
					</button>
				</div>
			</div>

			<div class="group">
				<div class="group__label">{{ $t('theme') }}</div>
				<ThemeSelect />
			</div>

			<div class="group">
				<div class="group__label">{{ $t('language') }}</div>
				<LangSelect />
			</div>
		</ModalSheet>
	</div>
</template>

<style lang="scss" scoped>
.group {
	& + & {
		margin-top: 16px;
	}

	&__label {
		margin-bottom: 7px;
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 1.6px;
		text-transform: uppercase;
		color: var(--text-faint);
	}
}

/* Поле имени: вдавленное, а не поднятое. Всё, во что можно писать, в этом
   языке уходит внутрь — так видно, что это не кнопка. */
.field {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 0 12px;
	height: 52px;
	border-radius: 14px;
	background: rgba(6, 9, 30, 0.5);
	box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.45), inset 0 0 0 2px rgba(255, 255, 255, 0.06);

	&__input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		font-size: 19px;
		font-weight: 900;
		color: #fff;
		outline: none;

		&::placeholder {
			color: var(--text-faint);
			font-weight: 700;
		}
	}

	&__count {
		font-size: 11px;
		font-weight: 800;
		color: var(--text-faint);
	}
}

.toggles {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}

.toggle {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	padding: 12px 8px 10px;
	border: none;
	border-radius: 15px;
	cursor: pointer;
	background: rgba(255, 255, 255, 0.05);
	box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.08);
	transition: transform 110ms var(--soft), box-shadow 180ms var(--soft),
		background 180ms var(--soft);

	&:active {
		transform: scale(0.97);
	}

	&__icon {
		margin-bottom: 2px;
		transition: filter 180ms var(--soft), opacity 180ms var(--soft);
		opacity: 0.5;
		filter: saturate(0.2);
	}

	&__name {
		font-size: 13px;
		font-weight: 800;
		color: var(--text-dim);
	}

	/* Состояние сказано словом, а не только цветом: «вкл/выкл» читается и в
	   монохроме, и человеком, который не различает эти два оттенка. */
	&__state {
		font-size: 10px;
		font-weight: 900;
		letter-spacing: 1.4px;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	&.is-on {
		background: rgba(69, 201, 119, 0.16);
		box-shadow: inset 0 0 0 2px rgba(120, 226, 160, 0.6), 0 0 18px rgba(69, 201, 119, 0.24);

		.toggle__icon {
			opacity: 1;
			filter: none;
		}

		.toggle__name {
			color: #fff;
		}

		.toggle__state {
			color: #7de3a0;
		}
	}
}
</style>
