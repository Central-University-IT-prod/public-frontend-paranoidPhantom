<script lang="ts" setup>
import type { Database } from "~/types/supabase";

import { object, string, type InferType } from "yup";
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
    title: "Авторизация",
});

const tabs = [
    {
        key: "signup",
        label: "Регистрация",
    },
    {
        key: "login",
        label: "Войти",
    },
];

const route = useRoute();
const router = useRouter();

const signup_state = reactive({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
});

const login_state = reactive({ email: "", password: "" });

const supabase = useSupabaseClient<Database>();

const pending_state = reactive({
    loging_in: false,
    signing_in: false,
});

const login_schema = object({
    email: string()
        .email("Недействительная почта")
        .required("Обязательное поле"),
    password: string().required("Обязательное поле"),
});

type LoginSchema = InferType<typeof login_schema>;

const onSubmitLogin = async (event: FormSubmitEvent<LoginSchema>) => {
    pending_state.loging_in = true;
    await supabase.auth.signInWithPassword(event.data);
    pending_state.loging_in = false;
    router.push((route.query.redirect as string | undefined) || "/");
};

const signup_schema = object({
    first_name: string().required("Обязательное поле"),
    last_name: string().required("Обязательное поле"),
    email: string()
        .email("Недействительная почта")
        .required("Обязательное поле"),
    password: string().required("Обязательное поле"),
});

type SignupSchema = InferType<typeof signup_schema>;

const confEmailSent = ref(false);
const onSubmitSignup = async (event: FormSubmitEvent<SignupSchema>) => {
    pending_state.signing_in = true;
    const { error } = await supabase.auth.signUp({
        email: event.data.email,
        password: event.data.password,
        options: {
            data: {
                first_name: event.data.first_name,
                last_name: event.data.last_name,
            },
        },
    });
    pending_state.signing_in = false;
    if (!error) confEmailSent.value = true;
};
</script>

<template>
    <main class="__auth flex flex-col items-center p-8 w-full">
        <UModal v-model="confEmailSent" prevent-close>
            <UCard>
                <UIcon class="w-16 h-16" name="fluent:mail-unread-32-filled" />
                <h2 class="text-xl font-semibold">
                    Мы отправили вам письмо подтверждение
                </h2>
                <p class="opacity-50">
                    Если не видите письмо, проверьте папку "спам"
                </p>
            </UCard>
        </UModal>
        <h2 class="text-3xl font-semibold">Авторизация</h2>
        <hr class="max-w-[480px] w-full my-4" />
        <UTabs :items="tabs" class="max-w-[480px] w-full">
            <template #item="{ item }">
                <UForm
                    class="signup flex flex-col items-center p-4 gap-4"
                    :state="signup_state"
                    :schema="signup_schema"
                    @submit="onSubmitSignup"
                    v-if="item.key === 'signup'"
                >
                    <div class="flex w-full gap-4">
                        <UFormGroup
                            required
                            class="w-full"
                            label="Имя"
                            name="first_name"
                        >
                            <UInput v-model="signup_state.first_name" />
                        </UFormGroup>
                        <UFormGroup
                            required
                            class="w-full"
                            label="Фамилия"
                            name="last_name"
                        >
                            <UInput v-model="signup_state.last_name" />
                        </UFormGroup>
                    </div>
                    <UFormGroup
                        required
                        class="w-full"
                        label="Почта"
                        name="email"
                    >
                        <UInput v-model="signup_state.email" />
                    </UFormGroup>
                    <UFormGroup
                        required
                        class="w-full"
                        label="Пароль"
                        name="password"
                    >
                        <UInput
                            type="password"
                            v-model="signup_state.password"
                        />
                    </UFormGroup>
                    <UButton
                        :loading="pending_state.signing_in"
                        type="submit"
                        trailing-icon="material-symbols:arrow-right-alt-rounded"
                        label="Зарегистрироваться"
                    />
                </UForm>
                <UForm
                    class="login flex flex-col items-center p-4 gap-4"
                    :state="login_state"
                    :schema="login_schema"
                    @submit="onSubmitLogin"
                    v-else-if="item.key === 'login'"
                >
                    <UFormGroup
                        required
                        class="w-full"
                        label="Почта"
                        name="email"
                    >
                        <UInput v-model="login_state.email" />
                    </UFormGroup>
                    <UFormGroup
                        required
                        class="w-full"
                        label="Пароль"
                        name="password"
                    >
                        <UInput
                            type="password"
                            v-model="login_state.password"
                        />
                    </UFormGroup>
                    <UButton
                        :loading="pending_state.loging_in"
                        type="submit"
                        trailing-icon="material-symbols:arrow-right-alt-rounded"
                        label="Войти"
                    />
                </UForm>
            </template>
        </UTabs>
    </main>
</template>

<style lang="scss" scoped></style>
