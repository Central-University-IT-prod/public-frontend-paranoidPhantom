<script lang="ts" setup>
const globalAvatarReload = useState("g_avatar_reload", () =>
    process.client
        ? parseInt(localStorage.getItem("g_avatar_reload") || "0")
        : undefined
);

watch(globalAvatarReload, (value) => {
    if (value) localStorage.setItem("g_avatar_reload", `${value}`);
});

onMounted(() => {
    if (process.client) {
        globalAvatarReload.value = parseInt(
            localStorage.getItem("g_avatar_reload") || "0"
        );
    }
});

defineProps<
    Partial<{
        uid?: string;
    }>
>();

const {
    public: {
        supabase: { url: supabase_url },
    },
} = useRuntimeConfig();
</script>

<template>
    <UAvatar
        :src="
            uid
                ? `${supabase_url}/storage/v1/object/public/avatars/${uid}.png?${globalAvatarReload}`
                : undefined
        "
        class="object-cover-avatar"
    />
</template>

<style lang="scss">
.object-cover-avatar {
    img {
        object-fit: cover;
    }
}
</style>
