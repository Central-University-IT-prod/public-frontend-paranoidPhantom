<script lang="ts" setup>
import type { DatabaseRow } from "~/types/db";
import type { Database } from "~/types/supabase";
import type { NuxtError } from "nuxt/app";
import type { User } from "@supabase/supabase-js";

definePageMeta({
    title: "Библиотека привычек",
});

const user = useSupabaseUser();
const supabase = useSupabaseClient<Database>();

const { data: habits, status } = useAsyncData(async () => {
    const { data } = await supabase.from("habits").select("*, profiles(*)");
    return data;
});

const trackings = ref<number[]>([]);

onMounted(async () => {
    const { data } = await supabase
        .from("habit-trackings")
        .select("source")
        .eq("owner", (user.value as User).id);
    trackings.value = (data as { source: number }[]).map(
        (entry) => entry.source
    );
});

const toast = useToast();
const router = useRouter();
const onTrackHabit = async (habit: DatabaseRow<"habits">) => {
    try {
        const success = await $fetch("/api/existing-habit", {
            method: "POST",
            query: { id: habit.id },
        });
        if (!success) return;
        router.push("/me");
    } catch (error) {
        if ((error as NuxtError).statusCode === 400) {
            toast.add({
                title: "Ой!",
                description:
                    "Вы достигли максимального количеества привычек. Это число записит от вашего уровня.",
                color: "red",
                icon: "fluent:location-not-found-24-filled",
            });
        }
    }
};

const timePeriodStrings = {
    daily: "Ежедневная",
    weekly: "Еженедельная",
    monthly: "Ежемесячная",
};

const categories = computed(() => {
    let retval: Set<string> = new Set();
    if (habits.value && status.value === "success") {
        habits.value.forEach((habit) => {
            retval.add(habit.category);
        });
    }
    return Array.from(retval);
});
</script>

<template>
    <div class="__library">
        <div
            class="flex flex-col gap-4 p-4 sm:p-8 w-full overflow-auto"
            v-for="category in categories"
            key="category"
        >
            <h3 class="text-2xl font-semibold">{{ category }}</h3>
            <div class="flex gap-4 w-fit">
                <UCard
                    v-for="habit in habits?.filter(
                        (entry) => entry.category === category
                    )"
                    :key="habit.id"
                    class="max-w-[500px]"
                >
                    <template #header>
                        <div class="flex items-center gap-8">
                            <h2 class="text-xl font-bold text-wrap">
                                {{ habit.title }}
                            </h2>
                            <UTooltip
                                :text="`${(habit.profiles as DatabaseRow<'profiles'>).first_name} ${(habit.profiles as DatabaseRow<'profiles'>).last_name}`"
                            >
                                <ULink :to="`/profile/${habit.owner}`">
                                    <UserAvatar
                                        :uid="(habit.owner as string)"
                                        size="md"
                                    />
                                </ULink>
                            </UTooltip>
                        </div>
                    </template>
                    <div class="flex gap-4 items-center">
                        <UBadge size="lg" variant="subtle">
                            <UIcon name="fluent:clock-bill-20-filled" />
                        </UBadge>
                        <p>{{ timePeriodStrings[habit.period] }}</p>
                    </div>
                    <UButton
                        v-if="!trackings.includes(habit.id)"
                        class="mt-4"
                        variant="soft"
                        label="Добавить"
                        @click="onTrackHabit(habit)"
                    />
                    <p class="italic opacity-50 mt-4" v-else>
                        Вы отслеживаете данную привычку
                    </p>
                </UCard>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
