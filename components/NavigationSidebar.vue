<script lang="ts" setup>
import { useWindowSize } from "@vueuse/core";
import type { Database } from "~/types/supabase";

const { width } = useWindowSize();
const mobileMode = ref(false);
const visible = ref(false);

onMounted(() => {
    mobileMode.value = width.value < 800;
    visible.value = true;
});

watch(width, (value) => {
    mobileMode.value = value < 800;
});

const user = useSupabaseUser();

const links = computed(() => [
    {
        icon: "fluent:home-20-filled",
        to: "/",
        label: "Домашняя",
    },
    {
        icon: "fluent:list-bar-tree-20-filled",
        to: "/me",
        label: "Мои привычки",
    },
    {
        icon: "fluent:library-20-filled",
        to: "/habits",
        label: "Библиотека привычек",
    },
    {
        icon: "fluent:shopping-bag-tag-20-filled",
        to: "/store",
        label: "Магазин",
    },
    {
        icon: "fluent:layer-diagonal-person-20-filled",
        to: "/friends",
        label: "Друзья",
    },
    {
        icon: "fluent:arrow-enter-20-filled",
        label: "Аккаунт",
        avatar: user.value ? user.value.id : undefined,
    },
]);

const route = useRoute();
const stats = useState<{
    xp: number;
    money: number;
}>("g_stats");
const level = useState<{
    current: number;
    next: number;
    min: number;
    max: number;
    value: number;
}>("g_level");

const supabase = useSupabaseClient<Database>();
const router = useRouter();

const avatarDropdownOptions = computed(() => {
    const retval = [];
    if (user.value) {
        retval.push(
            [
                {
                    label: "Профиль",
                    to: `/profile/${user.value.id}`,
                    icon: "fluent:inprivate-account-20-filled",
                },
                {
                    label: "Выйти",
                    click: async () => {
                        await supabase.auth.signOut();
                        window.location.reload();
                    },
                    icon: "fluent:arrow-exit-20-filled",
                },
            ],
            [
                {
                    slot: "stats",
                    variant: "ghost",
                },
            ]
        );
    } else {
        retval.push([
            {
                label: "Войти",
                to: "/auth",
                icon: "fluent:arrow-enter-20-filled",
            },
        ]);
    }
    return retval;
});
</script>

<template>
    <div class="__navigator" :class="{ mobile: mobileMode }" v-if="visible">
        <div class="__real">
            <div
                class="floater flex flex-col items-center gap-2 p-1 overflow-hidden rounded-lg divide-gray-200 dark:divide-gray-800 ring-1 ring-gray-200 dark:ring-gray-800 shadow bg-white dark:bg-gray-900"
                :class="{ mobile: mobileMode }"
            >
                <UTooltip
                    v-for="link in links"
                    :text="link.label"
                    :ui="{ container: link.avatar ? 'hidden' : 'group z-20' }"
                    :popper="{ placement: mobileMode ? 'top' : 'right' }"
                >
                    <UButton
                        v-if="!link.avatar"
                        :variant="
                            link.to === route.path ? 'outline' : undefined
                        "
                        :color="link.to === route.path ? 'primary' : 'white'"
                        class="w-fit"
                        size="xl"
                        :to="link.to"
                        :icon="link.icon"
                        :ui="
                            !!link.avatar
                                ? { rounded: 'rounded-full' }
                                : undefined
                        "
                    >
                    </UButton>
                    <UDropdown
                        v-else
                        mode="hover"
                        :items="avatarDropdownOptions"
                        :popper="{
                            placement: 'right',
                        }"
                        offset
                    >
                        <UserAvatar
                            :uid="link.avatar"
                            icon="fluent:inprivate-account-20-filled"
                            size="lg"
                            chip-color="primary"
                        />
                        <template #stats>
                            <div class="flex gap-2" v-if="stats">
                                <UBadge
                                    class="flex gap-1 items-center w-full"
                                    variant="subtle"
                                    size="xs"
                                >
                                    <UIcon
                                        name="fluent:arrow-outline-up-right-20-filled"
                                    />
                                    <span class="text-right truncate w-12">{{
                                        level.current
                                    }}</span>
                                </UBadge>
                                <UBadge
                                    class="flex gap-1 items-center w-full"
                                    variant="subtle"
                                    size="xs"
                                >
                                    <img
                                        src="/icons/64.png"
                                        alt="Чокопай койн"
                                        class="w-3"
                                    />
                                    <span class="text-right truncate w-12">{{
                                        stats.money
                                    }}</span>
                                </UBadge>
                            </div>
                        </template>
                    </UDropdown>
                </UTooltip>
                <ColorModeSwitch v-if="!mobileMode" />
            </div>
            <hr />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.__navigator {
    --sidebar-width: 150px;
    width: var(--sidebar-width);
    flex-shrink: 0;
    transition: all 0.3s ease-in-out;
    .__real {
        position: fixed;
        z-index: 3;
        left: 0;
        height: 100%;

        display: flex;
        align-items: center;
        justify-content: center;
        width: inherit;
        hr {
            width: 1px;
            height: 90%;
            border-left-width: 1px;
            right: 0;
            position: absolute;
        }
    }
    &.mobile {
        width: 0;
        .__real {
            padding: 1rem;
            width: 100%;
            height: unset;
            bottom: 0;
            .floater {
                flex-direction: row;
            }
        }
    }
}
</style>
