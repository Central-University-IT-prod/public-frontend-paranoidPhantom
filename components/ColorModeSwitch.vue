<script setup lang="ts">
const darkModeOn = ref();
const colorMode = useColorMode();
const init = ref(true);
const buttonDisabled = ref(false);

onMounted(() => {
    init.value = true;
    if (colorMode.preference === "system") {
        darkModeOn.value = colorMode.value === "dark";
    } else {
        darkModeOn.value = colorMode.preference === "dark";
    }
});

watchEffect(() => {
    if (darkModeOn.value) {
    }
    if (init.value === true) {
        init.value = false;
        return;
    }
    buttonDisabled.value = true;
    colorMode.preference = darkModeOn.value ? "dark" : "light";
    setTimeout(() => {
        buttonDisabled.value = false;
    }, 500);
});
</script>

<template>
    <ClientOnly>
        <div class="color-mode-switch">
            <UToggle
                :disabled="buttonDisabled"
                v-model="darkModeOn"
                on-icon="line-md:moon-rising-alt-loop"
                off-icon="line-md:sun-rising-loop"
            />
        </div>
        <template #fallback>
            <Icon name="svg-spinners:3-dots-scale" />
        </template>
    </ClientOnly>
</template>

<style scoped lang="scss">
.color-mode-switch {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}
</style>
