<script lang="ts" setup>
import type { Database } from "~/types/supabase";
import type {
    RealtimePostgresUpdatePayload,
    User,
} from "@supabase/supabase-js";

const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();

const router = useRouter();
const { site_name, rewards } = useAppConfig();
const globalTime = useState("g_time", () => new Date());
const updateHead = () => {
    const route = router.currentRoute.value;
    useHead({
        title: route.meta.title as string,
        titleTemplate: (title) =>
            title ? `${title} - ${site_name}` : site_name,
    });
};
callOnce(updateHead);

useHead({
    htmlAttrs: {
        lang: "ru",
    },
    meta: [
        {
            name: "viewport",
            content: "width=device-width, initial-scale=1",
        },
    ],
    link: [
        {
            rel: "icon",
            type: "image/x-icon",
            href: "/favicon.ico",
        },
    ],
});

const cookie = useCookie("time_offset");

onMounted(() => {
    setInterval(() => {
        globalTime.value = new Date(Date.now() + parseInt(cookie.value || "0"));
    }, 1000);
});

router.afterEach(updateHead);

const stats = useState("g_stats");

const level = useState("g_level", () => {
    return {
        current: 0,
        next: 0,
        min: 0,
        max: 0,
        value: 0,
    };
});

const updateLevel = async () => {
    if (process.server) return;
    const oldLevel = { ...level.value };
    const data = await $fetch("/api/level", {
        query: {
            levelUID: user.value ? user.value?.id : undefined,
        },
    });
    if (oldLevel.current !== data.current && oldLevel.current) {
        useReward("levelup", data.current, 0, rewards.money.levelup);
    }
    level.value = data;
};

watch(stats, updateLevel);

watchEffect(async () => {
    if (process.server) return;
    if (!user.value) return;
    const { data } = await supabase
        .from("profiles")
        .select("xp, money")
        .eq("id", (user.value as User).id)
        .single();
    if (data) {
        stats.value = data;
        updateLevel();
    }
});

const handleStatUpdate = (payload: RealtimePostgresUpdatePayload<any>) => {
    const { xp, money } = payload.new;
    stats.value = {
        xp: xp,
        money: money,
    };
};
supabase
    .channel("postgres_changes_stats")
    .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        handleStatUpdate
    )
    .subscribe();
</script>

<template>
    <div>
        <NuxtLoadingIndicator color="rgb(var(--color-primary-DEFAULT))" />
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
        <UNotifications />
    </div>
</template>
