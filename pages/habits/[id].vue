<script lang="ts" setup>
import type { Database } from "~/types/supabase";
import type { DatabaseRow } from "~/types/db";
import type { User } from "@supabase/supabase-js";
definePageMeta({
    title: "Привычка",
});
const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();

const route = useRoute();
const { id } = route.params as { id: string };

const { data: habit } = useAsyncData(async () => {
    const { data } = await supabase
        .from("habits")
        .select("*, profiles(*)")
        .eq("id", id)
        .maybeSingle();
    return data;
});

const timePeriodStrings = {
    daily: "Ежедневная",
    weekly: "Еженедельная",
    monthly: "Ежемесячная",
};
</script>

<template>
    <div class="__habit flex justify-center p-8">
        <UCard class="min-w-0 w-[800px]" v-if="habit">
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
        </UCard>
    </div>
</template>

<style lang="scss" scoped></style>
