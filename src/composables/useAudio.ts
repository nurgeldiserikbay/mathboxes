import { ref } from 'vue'

export const audioList: { [key: string]: string } = {
	click: '/sounds/click.m4r',
	correct: '/sounds/correct.m4r',
	error: '/sounds/error.m4r',
	result: '/sounds/result.mp3',
}

const audioActive = ref(true)

export const useAudio = () => {
	function playAudio(audioType: string, _anyway: boolean = false) {
		// Always respect the mute flag; `_anyway` kept for call-site compatibility.
		if (!audioActive.value || !audioList[audioType]) return

		const audio = new Audio(audioList[audioType])
		audio.play()
	}

	function toggleAudio() {
		audioActive.value = !audioActive.value
	}

	return {
		audioActive,
		toggleAudio,
		playAudio,
	}
}
