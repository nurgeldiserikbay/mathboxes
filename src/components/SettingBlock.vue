<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import IconSettings from '@/assets/img/settings.svg'
import IconLogin from '@/assets/img/login.svg'

import { useGameStore } from '@/store/gameStore'
import { useAudio } from '@/composables/useAudio'

import LangSelect from '@/components/LangSelect.vue'

const { playAudio } = useAudio()
const gameStore = useGameStore()

const isActive = ref(false)
const name = ref('')

onMounted(() => {
	name.value = gameStore.name
})

function saveName() {
	if (!name.value) return

	gameStore.setName(name.value)
}

function change(event: Event) {
	const target = event.target as HTMLInputElement

	if (target) {
		if (target.value.length > 12) target.value = target.value.slice(0, 12)
		name.value = target.value
	}
}
</script>

<template>
	<div class="settings">
		<button class="settings__btn" @click="playAudio('click', true), isActive = true">
			<IconSettings />
		</button>

		<div v-if="isActive" class="settings__body" @click="playAudio('click', true), isActive = false">
			<div class="container">
				<div
					class="settings__body-in"
					:style="{ background: gameStore.bgColor }"
					@click.stop=""
				>
					<div class="settings__input">
						<input
							:value="name"
							type="text"
							class="settings__input-body"
							@input="change"
							@keypress.enter="saveName"
						/>
						<button class="settings__input-btn" @click="saveName">
							<IconLogin />
						</button>
					</div>

					<LangSelect class="settings__select" />
					<button class="settings__ok" @click="playAudio('click', true), isActive = false">Ok</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.settings {
	&__btn {
		width: 35px;
		height: 35px;
		background: transparent;
		padding: 0;
		border: none;
		outline: none;
		cursor: pointer;

		svg {
			width: 100%;
			height: 100%;
		}
	}

	&__body {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		background: rgb(1, 109, 178);
	background: radial-gradient(
		circle,
		rgba(1, 109, 178, 1) 0%,
		rgba(1, 42, 74, 1) 100%
	);
	box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.4),
		inset 0px -2px 4px rgba(255, 255, 255, 0.2);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.container {
		width: 85%;
		max-width: 350px;
	}

	&__body-in {
		padding: 34px 28px 48px;
		border-radius: 12px;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		margin-bottom: 15px;
	}

	&__input {
		display: flex;
		align-items: stretch;
		width: 100%;
		height: 44px;
		border-radius: 15px;
		overflow: hidden;
		border: 1px solid #020202;
		box-sizing: border-box;
		margin-bottom: 28px;
	}

	&__input-body {
		width: 85%;
		background: transparent;
		border: none;
		font-size: 18px;
		font-style: italic;
		padding: 5px 10px 5px 18px;
		box-sizing: border-box;
		flex-grow: 1;
		outline: none;
	}

	&__input-btn {
		background: transparent;
		padding: 0;
		border: none;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		padding-right: 5px;

		svg {
			width: 24px;
			height: 24px;
			display: block;
		}
	}

	&__select {
		margin-bottom: 32px;
	}

	&__ok {
		color: #020202;
		background: transparent;
		padding: 12px 22px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 18px;
		font-weight: 600;
	}
}
</style>
