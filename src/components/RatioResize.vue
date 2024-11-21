<script lang="ts" setup>
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref } from 'vue'

const $props = defineProps<{
  width: number
  height: number
}>()

const $emits = defineEmits(['resized'])

const ratioResize = ref()
const ratio = ref(1)

const getSizeStyle = computed(() => {
  return {
    width: `${$props.width}px`,
    height: `${$props.height}px`,
  }
})
const getResizeStyle = computed(() => {
  return {
    transform: `scale(${ratio.value}) translate(-50%, -50%)`,
  }
})

onMounted(() => {
  resize()
})

onBeforeMount(() => {
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
})

function resize() {
  setRatio()
  setScaleOpt()
}

function setRatio() {
  const WH = window.innerHeight, WW = window.innerWidth
  if (WW / WH < $props.width / $props.height) ratio.value = WW / $props.width
  else ratio.value = WH / $props.height
}

function setScaleOpt() {
  nextTick(() => {
    const style = ratioResize.value?.getBoundingClientRect()
    $emits('resized', {
      offsetX: style.left,
      offsetY: style.top,
      ratio: ratio.value,
    })
  })
}
</script>

<template>
  <div class="ratio-resize" ref="ratioResize" :style="{ ...getSizeStyle, ...getResizeStyle }">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.ratio-resize {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform-origin: 0 0 !important;
}
</style>