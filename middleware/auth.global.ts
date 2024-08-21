export default defineNuxtRouteMiddleware((to, from) => {
	if (process.server || to.path === "/auth") return
	const user = useSupabaseUser();
	if (!user.value) return navigateTo({
		path: "/auth",
		query: { redirect: to.fullPath }
	})
})
