<script lang="ts" setup>
import type { Database } from "~/types/supabase";
import type { DatabaseRow } from "~/types/db";
import type { User } from "@supabase/supabase-js";
const supabase = useSupabaseClient<Database>();

definePageMeta({
    title: "Профиль",
    middleware: [
        async (to, from) => {
            const supabase = useSupabaseClient<Database>();
            const { error, data } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", to.params.uid)
                .maybeSingle();
            if (error)
                return abortNavigation({
                    statusCode: 404,
                    message: "Профиль не найден",
                });
        },
    ],
});

const route = useRoute();
const { uid } = route.params as { uid: string };
const user = useSupabaseUser() as Ref<User>;
const isSelf = computed(() => uid === user.value?.id);
const { data: profile } = (await supabase
    .from("profiles")
	.select("*")
    .eq("id", uid)
    .maybeSingle()) as { data: DatabaseRow<'profiles'> };

const { data: trackings } = await supabase
	.from("habit-trackings")
	.select("id, habits(title, id)")
	.eq("owner", uid);

const { data: interactions } = useAsyncData(async () => {
    const { data: interactions } = await supabase
        .from("social-interactions")
        .select();
    return interactions?.filter(
        (interaction) =>
            interaction.owner === uid||
            interaction.target === uid
    );
});

const { data: userInfo } = useAsyncData(async () => {
    let retval: Record<
        string,
        Database["public"]["Tables"]["profiles"]["Row"]
    > = {};
    const { data: profiles } = await supabase.from("profiles").select();
    profiles?.forEach((profile) => {
        retval[profile.id] = profile;
    });
    return retval;
}) as unknown as {
    data: Record<string, DatabaseRow<"profiles">>
};

if (!profile) {
	throw createError({
		statusCode: 404,
		message: "Профиль не найден",
	});
}

const tabs = [
    {
        key: "stats",
        label: "Уровень",
    },
    {
        key: "habits",
        label: "Привычки",
    },
    {
        key: "friends",
        label: "Друзья",
    },
];

const {
    global_icons: { no_avatar },
} = useAppConfig();

const editingAvatar = ref(false);
const userHasAvatar = ref(false);
const fileUpload = ref();

const globalAvatarReload = useState("g_avatar_reload", () =>
    process.client
        ? parseInt(localStorage.getItem("g_avatar_reload") || "0")
        : undefined
);

const refreshAvatarCheck = async () => {
	const { data } = await supabase.storage.from("avatars").list("", {
		offset: 0,
        sortBy: { column: "name", order: "asc" },
        search: `${uid}.png`,
    });
    const avatarPresent = Array.isArray(data) && data.length > 0;
    userHasAvatar.value = avatarPresent;
};

const editAvatar = () => {
    if (isSelf.value) {
        editingAvatar.value = true;
    }
};

const uploadingFile = ref(false);
watch(fileUpload, (element: HTMLInputElement) => {
    if (element) {
        element.addEventListener("change", async () => {
            if (element.files) {
                const file = element.files[0];
                if (file) {
                    uploadingFile.value = true;
                    const { error } = await supabase.storage
                        .from("avatars")
                        .upload(`${uid}.png`, file, {
                            upsert: true,
                        });
                    uploadingFile.value = false;
                    if (error) console.error(error);
                    else {
                        editingAvatar.value = false;
                        userHasAvatar.value = true;
                        refreshAvatarCheck();
						(globalAvatarReload.value as number)++
                    }
                }
            }
        });
    }
});

const removeAvatar = async () => {
    const { error } = await supabase.storage
        .from("avatars")
        .remove([`${uid}.png`]);
    if (error) console.error(error);
    else {
        editingAvatar.value = false;
        userHasAvatar.value = false;
        refreshAvatarCheck();
		(globalAvatarReload.value as number)++
    }
};

const { data: levelInfo } = useAsyncData(async () => {
	const data = await $fetch("/api/level", {
		query: { levelUID: uid },
	});
	return data
})

callOnce(refreshAvatarCheck);
</script>

<template>
    <div class="__profile p-4 flex flex-col items-center">
        <USlideover v-model="editingAvatar">
            <div class="flex flex-col items-center p-8 gap-8">
                <UserAvatar
                    :uid="userHasAvatar ? uid : undefined"
                    :icon="no_avatar"
                    size="3xl"
                />
                <template v-if="userHasAvatar">
                    <UButton
                        :disabled="uploadingFile"
                        icon="mdi:upload"
                        @click="fileUpload.click()"
                        ><input
                            type="file"
                            style="display: none"
                            ref="fileUpload"
                            accept=".png"
                        />Изменить фотографию</UButton
                    >
                    <UButton
                        :disabled="uploadingFile"
                        icon="mdi:delete"
                        @click="removeAvatar"
                        >Удалить</UButton
                    />
                </template>
                <UButton
                    v-else
                    :disabled="uploadingFile"
                    icon="mdi:upload"
                    @click="fileUpload.click()"
                    ><input
                        type="file"
                        style="display: none"
                        ref="fileUpload"
                        accept=".png"
                    />Загрузить фотографию</UButton
                >
            </div>
        </USlideover>
        <div class="flex items-center p-4">
            <div class="avatar" @click="editAvatar">
                <UserAvatar
                    :uid="userHasAvatar ? uid : undefined"
                    :icon="no_avatar"
                    size="lg"
                    :class="{ 'cursor-pointer': isSelf }"
                />
            </div>
            <div class="ml-4">
                <h2 class="text-2xl font-bold">{{ useFullName(profile) }}</h2>
            </div>
        </div>
		<UAlert
			color="primary"
			class="w-64 sm:w-96 mb-4"
			variant="subtle"
			title="Нажмите на автарку чтобы поменять её!"
			icon="fluent:info-20-filled"
			v-if="isSelf">
		</UAlert>
        <UCard class="min-w-64 sm:min-w-[600px]">
            <UTabs :items="tabs">
                <template #item="{ item }">
                    <div class="stats flex flex-col py-4 gap-4" v-if="item.key === 'stats'">
						<template v-if="levelInfo">
							<div class="flex justify-between">
								<p class="text-xl font-semibold">Уровень {{ levelInfo.current }}</p>
								<p class="text-xl font-semibold">Уровень {{ levelInfo.next }}</p>
							</div>
							<UMeter :value="levelInfo.value" :min="levelInfo.min" :max="levelInfo.max">
								<template #label="{ percent  }">
									<div class="flex justify-between relative">
										<p class="text-xs opacity-40">
											{{ levelInfo.min }}
										</p>
										<p class="text-md absolute" :style="{ top: `40%`, left: `${Math.max(4, Math.min(percent, 96) )}%` }">
											{{ levelInfo.value }}
										</p>
										<p class="text-xs opacity-40">
											{{ levelInfo.max }}
										</p>
									</div>
								</template>
							</UMeter>
						</template>
						<UIcon name="svg-spinners:ring-resize" class="my-4 mx-auto" v-else/>
					</div>
                    <div class="stats flex flex-col py-4 gap-4" v-else-if="item.key === 'habits'">
						<UButton v-for="tracking in trackings" :key="tracking.id" :label="(tracking.habits as DatabaseRow<'habits'>).title" :to="`/habits/${(tracking.habits as DatabaseRow<'habits'>).id}`" variant="soft"/>
					</div>
                    <div class="stats flex flex-col py-4 gap-4" v-else-if="item.key === 'friends'">
						<template
							v-for="interaction in interactions?.filter(
								(interaction) => interaction.interaction === 'accept'
							)"
						>
							<UCard v-if="userInfo[interaction.owner]">
								<div class="flex gap-2">
									<UserAvatar
										:uid="
											interaction.owner === uid
												? interaction.target
												: interaction.owner
										"
									/>
									<ULink
										class="text-xl"
										:to="`/profile/${interaction.target}`"
										v-if="interaction.owner === user?.id"
									>
										{{ userInfo[interaction.target].first_name }}
										{{ userInfo[interaction.target].last_name }}
									</ULink>
									<ULink
										class="text-xl"
										:to="`/profile/${interaction.owner}`"
										v-else
									>
										{{ userInfo[interaction.owner].first_name }}
										{{ userInfo[interaction.owner].last_name }}
									</ULink>
								</div>
							</UCard>
						</template>
					</div>
                </template>
            </UTabs>
        </UCard>
    </div>
</template>

<style lang="scss" scoped></style>
