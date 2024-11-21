<script lang="ts" setup>
import BookShelf from '@/components/BookShelf.vue'
</script>

<template>
	<div class="start-page">
		<BookShelf class="start-page__book-shelf" />
	</div>
</template>

<style lang="scss" scoped>
.start-page {
	position: relative;
	height: 100%;

	&__book-shelf {
		position: absolute;
		bottom: 10%;
		left: 50%;
		transform: translateX(-50%);
	}
}
</style>
