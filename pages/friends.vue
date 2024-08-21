<script lang="ts" setup>
import type { Database } from "~/types/supabase";
import type {
    User,
    RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

definePageMeta({
    title: "Друзья",
});

const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();

const groups = [
    {
        key: "users",
        label: (q: string) => q && `Ищем “${q}”...`,
        search: async (q: string) => {
            if (!q) {
                return [];
            }
            const query = q
                .split(" ")
                .map((word: string) => `'${word}'`)
                .join(" | ");
            const { data: users } = await supabase
                .from("profiles")
                .select()
                .textSearch("full_name", query);

            return users
                ? users
                      .filter((found) => found.id !== (user.value as User).id)
                      .map((found) => ({
                          id: found.id,
                          label: `${found.first_name} ${found.last_name}`,
                      }))
                : [];
        },
    },
];

const addModal = ref(false);
const toast = useToast();
const sendRequest = async (
    user_requested: Database["public"]["Tables"]["profiles"]["Row"]
) => {
    const { error } = await supabase.from("social-interactions").insert({
        owner: (user.value as User).id,
        target: user_requested.id,
        interaction: "request",
    });
    if (!error) {
        toast.add({
            id: `req_sent_${user_requested.id}`,
            title: "Запрос отправлен",
            icon: "fluent:send-20-filled",
            timeout: 5000,
        });
        addModal.value = false;
    }
};

const acceptRequest = async (id: string) => {
    const { error } = await supabase.from("social-interactions").insert({
        owner: (user.value as User).id,
        target: id,
        interaction: "accept",
    });
    if (!error) {
        const { error: removalError } = await supabase
            .from("social-interactions")
            .delete()
            .eq("owner", id)
            .eq("target", (user.value as User).id);
        if (!removalError) {
            toast.add({
                id: `req_accept_${id}`,
                title: "Запрос принят",
                icon: "mdi:check",
                timeout: 5000,
            });
        }
    }
};

const declineRequest = async (id: string) => {
    const { error } = await supabase
        .from("social-interactions")
        .delete()
        .eq("owner", id)
        .eq("target", (user.value as User).id);
    if (!error) {
        toast.add({
            id: `req_decline_${id}`,
            title: "Запрос отклонен",
            icon: "mdi:close",
            color: "red",
            timeout: 5000,
        });
    }
};

const removeFriend = async (owner: string, target: string) => {
    const { error } = await supabase
        .from("social-interactions")
        .delete()
        .eq("owner", owner)
        .eq("target", target);
    if (!error) {
        toast.add({
            id: `friend_remove_${owner}_${target}`,
            title: "Друг удален",
            icon: "mdi:close",
            color: "red",
            timeout: 5000,
        });
    }
};

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
    data: Record<string, Database["public"]["Tables"]["profiles"]["Row"]>;
};

const { data: interactions } = useAsyncData(async () => {
    const { data: interactions } = await supabase
        .from("social-interactions")
        .select();
    return interactions?.filter(
        (interaction) =>
            interaction.owner === (user.value as User).id ||
            interaction.target === (user.value as User).id
    );
});

const handleInteraction = (payload: RealtimePostgresChangesPayload<any>) => {
    if (interactions.value) {
        if (payload.eventType === "INSERT") {
            interactions.value.push(payload.new);
        } else if (payload.eventType === "DELETE") {
            interactions.value.forEach((action, index) => {
                if (action.id === (payload.old as Partial<any>).id) {
                    if (interactions.value) {
                        // TS made me do this(
                        interactions.value.splice(index, 1);
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
        { event: "*", schema: "public", table: "social-interactions" },
        handleInteraction
    )
    .subscribe();
</script>

<template>
    <div class="__friends">
        <UModal v-model="addModal">
            <UCommandPalette
                :groups="groups"
                :autoselect="false"
                placeholder="Поиск..."
                @update:model-value="sendRequest"
            ></UCommandPalette>
        </UModal>
        <div class="flex flex-col gap-4 p-4 sm:p-8">
            <h1 class="text-4xl font-semibold">Друзья</h1>
            <hr />
            <UButton class="w-fit m-2" variant="soft" @click="addModal = true"
                >Добавить друга</UButton
            >
            <template
                v-if="
                    interactions?.filter(
                        (interaction) => interaction.interaction === 'request'
                    ) &&
                    interactions?.filter(
                        (interaction) => interaction.interaction === 'request'
                    ).length > 0
                "
            >
                <h2 class="text-2xl font-semibold">Заявки</h2>
                <template
                    v-for="interaction in interactions?.filter(
                        (interaction) => interaction.interaction === 'request'
                    )"
                >
                    <UCard v-if="userInfo[interaction.owner]">
                        <ULink
                            class="flex gap-2"
                            v-if="interaction.owner === user?.id"
                            :to="`/profile/${interaction.target}`"
                        >
                            <UserAvatar :uid="interaction.target" />
                            <h3 class="text-xl">
                                {{ userInfo[interaction.target].first_name }}
                                {{ userInfo[interaction.target].last_name }}
                            </h3>
                            <p class="ml-auto opacity-50 italic">
                                Запрос отправлен
                            </p>
                        </ULink>
                        <div class="flex gap-2" v-else>
                            <UserAvatar :uid="interaction.owner" />
                            <ULink
                                class="text-xl"
                                :to="`/profile/${interaction.owner}`"
                            >
                                {{ userInfo[interaction.owner].first_name }}
                                {{ userInfo[interaction.owner].last_name }}
                            </ULink>
                            <div class="flex gap-2 ml-auto">
                                <UTooltip text="Принять">
                                    <UButton
                                        variant="soft"
                                        icon="mdi:check"
                                        @click="
                                            acceptRequest(interaction.owner)
                                        "
                                    />
                                </UTooltip>
                                <UTooltip text="Отклонить">
                                    <UButton
                                        variant="soft"
                                        icon="mdi:close"
                                        color="red"
                                        @click="
                                            declineRequest(interaction.owner)
                                        "
                                    />
                                </UTooltip>
                            </div>
                        </div>
                    </UCard>
                </template>
                <hr />
            </template>
            <template
                v-for="interaction in interactions?.filter(
                    (interaction) => interaction.interaction === 'accept'
                )"
            >
                <UCard v-if="userInfo[interaction.owner]">
                    <div class="flex gap-2">
                        <UserAvatar
                            :uid="
                                interaction.owner === (user as User).id
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
                        <UTooltip text="Удалить друга" class="ml-auto">
                            <UButton
                                variant="soft"
                                icon="mdi:close"
                                color="red"
                                @click="
                                    removeFriend(
                                        interaction.owner,
                                        interaction.target
                                    )
                                "
                            />
                        </UTooltip>
                    </div>
                </UCard>
            </template>
            <div
                class="flex gap-2 opacity-50 items-center"
                v-if="
                    interactions?.filter(
                        (interaction) => interaction.interaction === 'accept'
                    ).length === 0
                "
            >
                <UIcon class="w-8 h-8" name="fa6-solid:face-sad-cry" />
                <p>У вас пока нет друзей</p>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
