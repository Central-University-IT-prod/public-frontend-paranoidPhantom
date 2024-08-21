<script lang="ts" setup>
const state = reactive({
    enabled: false,
});

const cookie = useCookie("time_offset");
const date = ref();
onMounted(() => {
    date.value = new Date(Date.now() + parseInt(cookie.value || "0"));
});

watch(date, () => {
    cookie.value = (date.value.getTime() - new Date().getTime()).toString();
    state.enabled = false;
});
</script>

<template>
    <div class="_date-offset">
        <UButton
            @click="state.enabled = true"
            variant="soft"
            label="Поменять время"
        />
        <UModal v-model="state.enabled">
            <div class="p-4 w-fit mx-auto flex flex-col items-center">
                <DatePicker v-model="date"></DatePicker>
            </div>
        </UModal>
    </div>
</template>

<style lang="scss" scoped></style>
