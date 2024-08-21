import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase';

export default defineEventHandler(async (event) => {
	if (!event.path.startsWith("/api")) return
	const supabase = serverSupabaseServiceRole<Database>(event)
	let cookies: Record<string, string> = {}
	event.headers.get("Cookie")?.split("; ").forEach(cookieKV => {
		const [key, value] = cookieKV.split("=")
		cookies[key] = value
	});
	event.context.time_offset = cookies["time_offset"] ? parseInt(cookies["time_offset"]) : 0
	const { data: { user } } = await supabase.auth.getUser(cookies["sb-access-token"])
	const checkHabitCap = event.path.startsWith("/api/habit") || event.path.startsWith("/api/existing-habit")
	const checkLevel = event.path.startsWith("/api/level") || checkHabitCap
	if (checkLevel) {
		const { levelUID } = getQuery(event) as { levelUID: string }
		const { data: profile } = await supabase.from("profiles").select("xp").eq("id", levelUID || user.id).single()
		let oldsum = 0
		let sum = 0
		let x = 0
		while (sum < (profile?.xp as number)) { // See progression.md
			oldsum = sum
			sum += Math.floor(1.01 ** x * 1000);
			x++;
		}
		event.context.user = {
			...user, level: {
				current: x,
				next: x + 1,
				min: oldsum,
				max: sum,
				value: profile?.xp
			}
		}
		if (checkHabitCap) {
			const { count: trackingCount } = await supabase.from('habit-trackings')
				.select('*', { count: 'exact', head: true }).eq("owner", user.id);

			const { current: currentLevel } = event.context.user?.level ?? { current: 1 }
			let maximumHabits = 1
			if (currentLevel === 1) maximumHabits = 1
			if (currentLevel >= 2) maximumHabits = 2
			if (currentLevel >= 5) maximumHabits = 3
			if (currentLevel >= 10) maximumHabits = 4
			if (currentLevel >= 25) maximumHabits = 5
			event.context.habitcap = {
				trackingCount,
				maximumHabits
			}
		}
	} else {
		event.context.user = user
	}
})
