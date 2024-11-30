<script lang="ts" setup>
import { LEVELS } from '@/utils/conts'

import CubeRube from '@/components/CubeRube.vue'
</script>

<template>
	<div class="logo">
    <CubeRube
      :show="true"
      :value="'M'"
      :animateClass="''"
      :bgcolor="LEVELS[7].bgColor"
    />
    <CubeRube
      :show="true"
      :value="'+'"
      :animateClass="''"
      :bgcolor="LEVELS[1].bgColor"
    />
    <CubeRube
      :show="true"
      :value="'-'"
      :animateClass="''"
      :bgcolor="LEVELS[2].bgColor"
    />
    <CubeRube
      :show="true"
      :value="'B'"
      :animateClass="''"
      :bgcolor="LEVELS[5].bgColor"
    />
  </div>
</template>

<style lang="scss" scoped>
.logo {
  width: 100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  margin-bottom: 15px;

  :deep(.value) {
    font-size: 28px;
    font-weight: 800;
    font-style: italic;
    color: #3b3b3b;
  }
}
</style>
