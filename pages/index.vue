<script lang="ts" setup>
definePageMeta({
    title: "Домашняя",
});
</script>

<template>
    <div class="p-8 flex flex-col items-center gap-4">
        <h1 class="text-2xl font-semibold">
            Здесь должен был быть прикольный грид с хайлайтами активности, но я
            не успел(
        </h1>
        <UButton
            to="/me"
            label="Можете принять эту страницу за 'домашнюю'"
            variant="soft"
            size="xl"
        />
    </div>
</template>

<style lang="scss" scoped></style>
