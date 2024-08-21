<script lang="ts" setup>
import { object, string, number, type InferType, boolean } from "yup";
import { computedAsync } from "@vueuse/core";
import type { FormSubmitEvent } from "#ui/types";
import type { Database } from "~/types/supabase";
import type { DatabaseRow } from "~/types/db";
import type {
    User,
    RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import type { NuxtError } from "nuxt/app";

definePageMeta({
    title: "Мои привычки",
});

const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser() as Ref<User>;

const globalTime = useState("g_time", () => new Date());

const periods = [
    { value: "daily", label: "День" },
    { value: "weekly", label: "Неделя" },
    { value: "monthly", label: "Месяц" },
];

const initialNewHabitState: Record<string, any> = {
    enabled: false,
    title: "",
    category: "",
    targetValue: "",
    targetValueUnit: "",
    period: periods[0].value,
    showOnProfile: true,
    showInLibrary: true,
};

let newHabitState = reactive({ ...initialNewHabitState });

const habit_schema = object({
    title: string().required("Название обязательно"),
    category: string().required("Категория обязательна"),
    targetValue: number()
        .transform((val, orig) => (orig == "" ? undefined : val))
        .typeError("Цель должна быть числом"),
    targetValueUnit: string(),
    period: string(),
    showOnProfile: boolean(),
    showInLibrary: boolean(),
});

type newHabitSchema = InferType<typeof habit_schema>;

const toast = useToast();

const onNewHabit = async (event: FormSubmitEvent<newHabitSchema>) => {
    try {
        const success = await $fetch("/api/habit", {
            method: "POST",
            body: JSON.stringify(event.data),
        });
        if (!success) return;
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
    const keys = Object.keys(initialNewHabitState);
    for (const key of keys) {
        newHabitState[key] = initialNewHabitState[key];
    }
};

const { data: myTrackings } = useAsyncData(async () => {
    const { data } = await supabase
        .from("habit-trackings")
        .select("*, habits(*)")
        .eq("owner", user.value.id);
    return data;
});

const { data: actions } = useAsyncData(async () => {
    const { data } = await supabase
        .from("habit-actions")
        .select()
        .eq("owner", user.value.id);
    return data;
});
const handleAction = (payload: RealtimePostgresChangesPayload<any>) => {
    if (actions.value !== null) {
        if (payload.eventType === "INSERT") {
            actions.value.push(payload.new);
        } else if (payload.eventType === "DELETE") {
            actions.value.forEach((action, index) => {
                if (action.id === (payload.old as Partial<any>).id) {
                    if (actions.value !== null) {
                        // TS made me do this(
                        actions.value.splice(index, 1);
                    }
                }
            });
        }
    }
};
supabase
    .channel("postgres_changes_custom")
    .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit-actions" },
        handleAction
    )
    .subscribe();

const { timePeriods, dayPeriods, rewards } = useAppConfig();

const statusTable = computed(() => {
    let retval: Record<number, any> = {};
    if (!myTrackings.value) return {};
    myTrackings.value.forEach((tracking) => {
        const habitInfo = tracking.habits;
        if (!habitInfo) return;
        const currentTime = globalTime.value.getTime();
        let checkingDate = new Date(tracking.date as string);
        let completed = false;
        while (checkingDate.getTime() < currentTime) {
            checkingDate.setDate(
                checkingDate.getDate() + dayPeriods[habitInfo.period]
            );
        }
        if (actions.value) {
            actions.value
                .filter((action) => action.tracking_id === tracking.id)
                .forEach((action) => {
                    if (
                        new Date(action.date).getTime() >=
                            checkingDate.getTime() -
                                timePeriods[habitInfo.period] &&
                        new Date(action.date).getTime() < checkingDate.getTime()
                    ) {
                        completed = true;
                    }
                });
        }
        let timeLeft: string | undefined;
        if (!completed) {
            const timeDiff =
                checkingDate.getTime() -
                currentTime +
                checkingDate.getTimezoneOffset() * 60 * 1000;
            const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
            const hours = Math.floor(
                (timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
            );
            const minutes = Math.floor(
                (timeDiff % (60 * 60 * 1000)) / (60 * 1000)
            );
            const seconds = Math.floor((timeDiff % (60 * 1000)) / 1000);
            timeLeft = `${days.toString().padStart(2, "0")}:${hours
                .toString()
                .padStart(2, "0")}:${minutes
                .toString()
                .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        retval[tracking.id] = {
            completed,
            timeLeft,
        };
    });
    return retval;
});

type MergedTracking = {
    habits: DatabaseRow<"habits"> | null;
} & DatabaseRow<"habit-trackings">;

const trackingDetailsState = reactive<{
    enabled: boolean;
    tracking?: MergedTracking;
}>({
    enabled: false,
});

const openDetails = (tracking: MergedTracking) => {
    trackingDetailsState.tracking = tracking;
    trackingDetailsState.enabled = true;
};

const deleteTracking = async (id: number, stop?: boolean) => {
    const success = await $fetch(`/api/habit`, {
        method: "DELETE",
        body: {
            id,
        },
        query: {
            stop,
        },
    });
    if (success && myTrackings.value) {
        myTrackings.value.forEach((tracking, index) => {
            if (myTrackings.value) {
                if (stop) myTrackings.value[index].stopped = true;
                else myTrackings.value?.splice(index, 1);
            }
        });
    }
};

const trackingOption = (tracking: MergedTracking) => {
    let res: Record<string, string>[][] = [
        [
            {
                label: "Детали",
                icon: "fluent:book-information-20-filled",
                key: "details",
            },
        ],
        [
            {
                label: "Удалить навсегда",
                icon: "i-heroicons-trash-20-solid",
                key: "delete",
            },
        ],
    ];
    if (!tracking.stopped) {
        res[1].unshift({
            label: "Приостановить",
            icon: "ci:stop-sign",
            key: "stop",
        });
    }
    return res;
};

const timePeriodStrings = {
    daily: "Ежедневно",
    weekly: "Еженедельно",
    monthly: "Ежемесячно",
};

const trackingDetailsOwnerInfo = computedAsync(async () => {
    if (trackingDetailsState.tracking && trackingDetailsState.tracking.habits) {
        const { data } = await supabase
            .from("profiles")
            .select()
            .eq("id", trackingDetailsState.tracking.habits.owner as string)
            .single();
        return data;
    } else return undefined;
});

const trackingActionState = reactive<{
    enabled: boolean;
    tracking?: MergedTracking;
    enteredValue: string;
    requested: boolean;
}>({
    enabled: false,
    enteredValue: "",
    requested: false,
});

const addTrackingAction = async (id: number) => {
    trackingActionState.requested = true;
    const { error, data } = await supabase
        .from("habit-actions")
        .insert({
            tracking_id: id,
            date: globalTime.value.toISOString().substring(0, 10),
            value:
                trackingActionState.enteredValue === ""
                    ? null
                    : parseFloat(trackingActionState.enteredValue),
            owner: user.value.id,
        })
        .select()
        .maybeSingle();
    trackingActionState.requested = false;
    if (data) {
        useReward("tracking", data.id, rewards.xp.tracking, 0);
    }
    if (!error) trackingActionState.enabled = false;
};

const timeOffset = useCookie("time_offset");

const trackingStreaks = computedAsync(async () => {
    if (timeOffset.value) console.log("Refresh streaks");
    if (actions.value) {
        let retval: Record<number, number> = {};
        const promises = myTrackings.value?.map((tracking) => {
            return $fetch("/api/streak", {
                query: {
                    id: tracking.id,
                },
                body: actions.value?.filter(
                    (actions) => actions.tracking_id === tracking.id
                ),
                method: "POST",
            });
        }) as Promise<number>[];
        const results = await Promise.all(promises);
        results.forEach((result, index) => {
            retval[(myTrackings.value as any) /* Бог простит */[index].id] =
                result;
        });
        return retval;
    } else return {};
});

const sections = computed(() => {
    return [
        {
            list: myTrackings.value?.filter(
                (tracking) => tracking.habits?.period === "daily"
            ),
            label: "Сегодня",
        },
        {
            list: myTrackings.value?.filter(
                (tracking) => tracking.habits?.period === "weekly"
            ),
            label: "На этой неделе",
        },
        {
            list: myTrackings.value?.filter(
                (tracking) => tracking.habits?.period === "monthly"
            ),
            label: "В этом месяце",
        },
    ];
});
const JSONFormState = reactive<{
    enabled: boolean;
    input: string;
    loading: boolean | string;
}>({
    enabled: false,
    input: "",
    loading: false,
});
const SubmitJSON = async () => {
    try {
        JSONFormState.loading = "Делаем вам 25 уровень";
        await useReward("upload_as_json", "1", 27000, 0);
        JSONFormState.loading = "Парсим JSON";
        const uploaded: {
            habits: {
                id: number;
                title: string;
                category: string;
                addDate: string;
                period: string;
            }[];
            actions: {
                id: number;
                date: string;
            }[];
        } = JSON.parse(JSONFormState.input);
        if (uploaded.habits.length > 5) {
            toast.add({
                title: "Ой!",
                description: "Вы не можете загрузить больше 5 привычек.",
                color: "red",
                icon: "fluent:location-not-found-24-filled",
            });
        }
        for (let i = 0; i < uploaded.habits.length; i++) {
            const habit = uploaded.habits[i];
            try {
                JSONFormState.loading = `Загружаем привычку ${i + 1} / ${
                    uploaded.habits.length
                }`;
                const success = await $fetch("/api/habit", {
                    method: "POST",
                    body: {
                        overrideTrackingID: habit.id,
                        title: habit.title,
                        category: habit.category,
                        period: habit.period,
                        date: habit.addDate,
                        showOnProfile: true,
                        showInLibrary: true,
                    },
                });
            } catch (error) {
                toast.add({
                    title: "Серверная ошибка",
                    description: error as string,
                    color: "red",
                    icon: "fluent:location-not-found-24-filled",
                });
            }
        }
        for (let i = 0; i < uploaded.actions.length; i++) {
            const action = uploaded.actions[i];
            const { error } = await supabase.from("habit-actions").insert({
                tracking_id: action.id,
                date: action.date,
                owner: user.value.id,
            });
            if (error) {
                toast.add({
                    title: "Серверная ошибка",
                    description: error.message,
                    color: "red",
                    icon: "fluent:location-not-found-24-filled",
                });
            }
        }

        // Всё хорошо
        JSONFormState.enabled = false;
        window.location.reload();
    } catch (error) {
        toast.add({
            title: "Ошибка",
            description: error as string,
            color: "red",
            icon: "fluent:location-not-found-24-filled",
        });
    }
    JSONFormState.loading = false;
};
</script>

<template>
    <div class="__me">
        <!-- New tracking modal -->
        <UModal v-model="newHabitState.enabled">
            <UCard>
                <UForm
                    @submit="onNewHabit"
                    :state="newHabitState"
                    :schema="habit_schema"
                    class="flex flex-col gap-4"
                >
                    <UAlert
                        color="primary"
                        variant="subtle"
                        title="Кстати!"
                        icon="fluent:info-20-filled"
                    >
                        <template #description>
                            Возможно нужная вам привычка уже есть в
                            <UButton variant="link" :padded="false" to="/habits"
                                >библиотеке</UButton
                            >
                        </template>
                    </UAlert>
                    <UFormGroup name="title" label="Название" required>
                        <UInput v-model="newHabitState.title" />
                    </UFormGroup>
                    <UFormGroup name="category" label="Категория" required>
                        <UInput v-model="newHabitState.category" />
                    </UFormGroup>
                    <div class="flex gap-2">
                        <UFormGroup
                            name="targetValue"
                            label="Цель"
                            class="grow"
                        >
                            <UInput
                                nputmode="numeric"
                                pattern="[0-9]*"
                                v-model="newHabitState.targetValue"
                            />
                        </UFormGroup>
                        <UFormGroup label="Единица измерения">
                            <UInput v-model="newHabitState.targetValueUnit" />
                        </UFormGroup>
                    </div>
                    <UFormGroup name="period" label="Период" required>
                        <URadioGroup
                            v-model="newHabitState.period"
                            :options="periods"
                        />
                    </UFormGroup>
                    <UFormGroup
                        name="showOnProfile"
                        label="Отображать на профиле"
                        required
                    >
                        <UToggle v-model="newHabitState.showOnProfile" />
                    </UFormGroup>
                    <UFormGroup
                        name="showInLibrary"
                        label="Опубликовать в библиотеке привычек"
                        required
                    >
                        <UToggle v-model="newHabitState.showInLibrary" />
                    </UFormGroup>
                    <UButton label="Создать" type="submit" />
                </UForm>
            </UCard>
        </UModal>
        <!-- Tracking details modal -->
        <UModal v-model="trackingDetailsState.enabled">
            <UCard
                v-if="
                    trackingDetailsState.tracking &&
                    trackingDetailsState.tracking.habits
                "
            >
                <div class="flex flex-col gap-2">
                    <div class="flex items-center">
                        <h2 class="text-2xl font-semibold">
                            {{ trackingDetailsState.tracking.habits.title }}
                        </h2>
                        <span class="ml-auto opacity-50">
                            {{ trackingDetailsState.tracking.habits.category }}
                        </span>
                    </div>
                    <hr class="my-4" />
                    <div
                        class="flex gap-2"
                        v-if="trackingDetailsState.tracking.habits.targetValue"
                    >
                        <UBadge size="lg" variant="subtle">
                            <UIcon name="fluent:target-arrow-20-filled" />
                        </UBadge>
                        <p>
                            {{
                                trackingDetailsState.tracking.habits.targetValue
                            }}
                            {{
                                trackingDetailsState.tracking.habits
                                    .targetValueUnit
                            }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <UBadge size="lg" variant="subtle">
                            <UIcon name="fluent:clock-bill-20-filled" />
                        </UBadge>
                        <p>
                            {{
                                timePeriodStrings[
                                    trackingDetailsState.tracking.habits.period
                                ]
                            }}
                            с
                            {{
                                new Date(
                                    trackingDetailsState.tracking.date
                                ).toLocaleDateString("ru")
                            }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <UBadge size="lg" variant="subtle">
                            <UIcon name="fluent:eye-lines-20-filled" />
                        </UBadge>
                        <p>
                            {{
                                trackingDetailsState.tracking.restricted
                                    ? "Не отображается на профиле"
                                    : "Отображается на профиле"
                            }}
                        </p>
                    </div>
                    <ULink
                        class="flex gap-2"
                        v-if="!trackingDetailsState.tracking.habits.restricted"
                        :to="`/habits/${trackingDetailsState.tracking.habits.id}`"
                    >
                        <UBadge size="lg" variant="subtle">
                            <UIcon name="fluent:link-20-filled" />
                        </UBadge>
                        <p>Есть в библиотеке</p>
                    </ULink>

                    <p class="mt-2 font-medium">Автор</p>
                    <ULink
                        class="flex gap-2 items-center"
                        v-if="trackingDetailsOwnerInfo"
                        :to="`/profile/${trackingDetailsOwnerInfo.id}`"
                    >
                        <UserAvatar :uid="trackingDetailsOwnerInfo.id" />
                        <p v-if="trackingDetailsOwnerInfo.id === user.id">Вы</p>
                        <p v-else>
                            {{ trackingDetailsOwnerInfo?.first_name }}
                            {{ trackingDetailsOwnerInfo?.last_name }}
                        </p>
                    </ULink>
                    <div class="flex gap-2 items-center" v-else>
                        <USkeleton
                            :ui="{ rounded: 'rounded-full' }"
                            class="w-8 h-8"
                        />
                        <USkeleton class="w-full h-5" />
                    </div>
                    <p>История</p>
                    <UCard
                        v-for="action in actions
                            ?.filter(
                                (action) =>
                                    action.tracking_id ===
                                    trackingDetailsState.tracking.id
                            )
                            .sort((a, b) => b.id - a.id)"
                    >
                        <div class="flex gap-2">
                            <UBadge variant="subtle">
                                {{
                                    new Date(action.date).toLocaleDateString(
                                        "ru"
                                    )
                                }}
                            </UBadge>
                            <UBadge variant="subtle" v-if="action.value">
                                {{ action.value }}
                                {{
                                    trackingDetailsState.tracking.habits
                                        .targetValueUnit
                                }}
                            </UBadge>
                        </div>
                    </UCard>
                </div>
            </UCard>
        </UModal>
        <!-- Tracking action modal -->
        <UModal v-model="trackingActionState.enabled">
            <UCard
                v-if="
                    trackingActionState.tracking &&
                    trackingActionState.tracking.habits
                "
            >
                <template #header>
                    <h2 class="text-2xl font-semibold">
                        Трекаем '<i>{{
                            trackingActionState.tracking.habits.title
                        }}</i
                        >'?
                    </h2>
                </template>
                <div class="flex flex-col gap-4">
                    <UFormGroup
                        label="Результат"
                        required
                        v-if="trackingActionState.tracking.habits.targetValue"
                    >
                        <UInput
                            v-model="trackingActionState.enteredValue"
                            nputmode="numeric"
                            pattern="[0-9]*"
                        >
                            <template #trailing>
                                <span class="opacity-50">{{
                                    trackingActionState.tracking.habits
                                        .targetValueUnit
                                }}</span>
                            </template>
                        </UInput>
                    </UFormGroup>
                    <UButton
                        :disabled="
                            (trackingActionState.tracking.habits.targetValue &&
                                trackingActionState.enteredValue === '') ||
                            trackingActionState.requested
                        "
                        @click="
                            addTrackingAction(trackingActionState.tracking.id)
                        "
                        >Да!</UButton
                    >
                </div>
            </UCard>
        </UModal>
        <!-- JSON формат -->
        <UModal
            v-model="JSONFormState.enabled"
            :prevent-close="JSONFormState.loading"
        >
            <UCard>
                <template v-if="!JSONFormState.loading">
                    <UTextarea rows="30" resize v-model="JSONFormState.input" />
                    <UAlert
                        title="Очень важно!"
                        class="mt-4"
                        color="red"
                        variant="subtle"
                        icon="fluent:warning-20-filled"
                        description="Из-за того что по дефолту есть лимит на отслеживание привычек, во время загрузки их в формате JSON вам будет присвоен 25 уровень, и даже при этом лимит будет = 5. Прошу учесть это при загрузке."
                    />
                    <UButton
                        label="Загрузить"
                        class="mt-4"
                        @click="SubmitJSON"
                    />
                </template>
                <template v-else>
                    <UIcon name="svg-spinners:ring-resize" />
                    <p
                        v-if="typeof JSONFormState.loading === 'string'"
                        class="mt-4"
                    >
                        {{ JSONFormState.loading }}
                    </p>
                </template>
            </UCard>
        </UModal>
        <!-- Actual page -->
        <div class="trackings flex flex-col gap-4 p-4 sm:p-8">
            <h1 class="text-4xl font-semibold">Мои привычки</h1>
            <hr />
            <div class="flex gap-4 flex-wrap">
                <UButton
                    @click="newHabitState.enabled = true"
                    class="w-fit"
                    variant="soft"
                    >Новая привычка</UButton
                >
                <UButton
                    @click="JSONFormState.enabled = true"
                    class="w-fit"
                    variant="soft"
                    >Загрузить в JSON формате</UButton
                >
                <DateOffset />
            </div>
            <p class="opacity-30 italic">
                Дата: {{ globalTime.toLocaleDateString("ru") }}
            </p>
            <template v-for="(section, index) in sections">
                <h2
                    class="text-3xl font-semibold"
                    :class="{ 'mt-8': index > 0 }"
                >
                    {{ section.label }}
                </h2>
                <hr class="opacity-10" />
                <template v-if="section.list && section.list.length > 0">
                    <UCard
                        v-for="tracking in section.list"
                        :key="tracking.id"
                        :ui="{ body: { base: 'flex gap-4' } }"
                    >
                        <UBadge
                            color="orange"
                            variant="subtle"
                            class="flex items-center text-sm sm:text-md font-semibold gap-2 h-fit my-auto"
                            v-if="
                                !trackingStreaks ||
                                trackingStreaks[tracking.id] !== 0
                            "
                        >
                            <UIcon name="fxemoji:fire" />
                            <span
                                v-if="
                                    trackingStreaks &&
                                    trackingStreaks[tracking.id]
                                "
                            >
                                {{ trackingStreaks[tracking.id] }}</span
                            >
                            <span
                                v-else
                                style="width: 11px; height: 28px"
                                class="blur-sm"
                                >?</span
                            >
                        </UBadge>
                        <h3 class="text-lg sm:text-xl flex-grow">
                            {{ tracking.habits?.title }}
                        </h3>

                        <div
                            class="ml-auto flex items-center flex-shrink flex-wrap gap-4"
                            v-for="status in [statusTable[tracking.id]]"
                            key="_"
                        >
                            <template v-if="!tracking.stopped">
                                <UBadge
                                    variant="subtle"
                                    size="lg"
                                    v-if="status.completed"
                                >
                                    <UIcon name="mdi:check" />
                                </UBadge>
                                <template v-else>
                                    <UTooltip
                                        v-if="status.timeLeft"
                                        text="Осталось времени"
                                    >
                                        <p>{{ status.timeLeft }}</p>
                                    </UTooltip>
                                    <UButton
                                        icon="fluent:checkmark-note-20-filled"
                                        variant="soft"
                                        color="rose"
                                        @click="
                                            trackingActionState.enabled = true;
                                            trackingActionState.tracking =
                                                tracking;
                                        "
                                    />
                                </template>
                            </template>
                            <UPopover v-else class="flex items-center ml-auto">
                                <p class="text-right">
                                    Привычка приостановленна
                                </p>
                                <template #panel>
                                    <div class="p-2">
                                        <p class="text-right">
                                            Привычка больше не трекается, но вы
                                            можете посмотреть информацию о ней
                                        </p>
                                    </div>
                                </template>
                            </UPopover>
                            <UDropdown
                                :items="trackingOption(tracking) as any /* Бог простит */"
                                :popper="{ placement: 'bottom-end' }"
                                :ui="{ item: { padding: '' } }"
                            >
                                <UButton
                                    color="primary"
                                    variant="soft"
                                    class="h-fit"
                                    trailing-icon="i-heroicons-chevron-down-20-solid"
                                />
                                <template #item="{ item }">
                                    <div
                                        class="p-2 flex gap-2 w-full h-full items-center"
                                        @click="
                                            item.key === 'details'
                                                ? openDetails(tracking)
                                                : item.key === 'stop'
                                                ? deleteTracking(
                                                      tracking.id,
                                                      true
                                                  )
                                                : item.key === 'delete'
                                                ? deleteTracking(tracking.id)
                                                : null
                                        "
                                    >
                                        <UIcon :name="item.icon" />
                                        <span>{{ item.label }}</span>
                                    </div>
                                </template>
                            </UDropdown>
                        </div>
                    </UCard>
                </template>
                <div class="flex items-center gap-2 opacity-20" v-else>
                    <UIcon
                        name="fluent:line-horizontal-4-search-20-filled"
                        class="w-8 h-8"
                    />
                    <h3>Тут пусто</h3>
                </div>
            </template>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
