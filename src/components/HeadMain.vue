<script lang="ts" setup>
import SettingBlock from '@/components/SettingBlock.vue'
import HistoryBlock from '@/components/HistoryBlock.vue'
</script>

<template>
	<div class="head">
		<div class="container head__container">
			<HistoryBlock />
			<SettingBlock />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.head {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 500;
	width: 100%;
	padding: 15px 25px 0px;
	box-sizing: border-box;
	display: flex;
	justify-content: space-between;
	align-items: center;

	&__container {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin: 0 auto;
	}
}
</style>
