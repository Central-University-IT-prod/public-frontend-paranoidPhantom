<script lang="ts" setup></script>

<template>
    <div class="__layout">
        <Transition name="fade">
            <NavigationSidebar />
        </Transition>
        <slot />
    </div>
</template>

<style lang="scss">
.__layout {
    display: flex;
    > div:not(.__navigator) {
        width: 100%;
    }

    .fade-enter-from,
    .fade-leave-to {
        opacity: 0;
        width: 0;
    }
    .fade-enter-active,
    .fade-leave-active {
        transition: all 0.5s;
    }
}
</style>
