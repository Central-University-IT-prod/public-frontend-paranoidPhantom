import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase';

export default defineEventHandler(async (event) => {
	try {
		const { dayPeriods } = useAppConfig()

		const { id } = getQuery(event) as { id: string };

		const supabase = serverSupabaseServiceRole<Database>(event)
		const { user } = event.context
		if (!user) return new Response("Unauthorized", { status: 401 });

		const { data: tracking } = await supabase.from("habit-trackings").select("*, habits(*)").eq("id", id).single()
		if (!tracking) return new Response("Not Found", { status: 404 });
		if (!tracking.habits) return new Response("Not Found", { status: 404 });
		if (tracking.restricted && tracking.owner !== user.id) return new Response("Unauthorized", { status: 401 });

		const actions = await readBody(event) as { date: string }[]
		actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

		const borderDays = []
		const currentTime = Date.now() + event.context.time_offset;
		let check = new Date(tracking.date as string);
		while (check.getTime() < currentTime) {
			borderDays.push(new Date(check))
			check.setDate(
				check.getDate() + dayPeriods[tracking.habits.period]
			);
		}
		borderDays.push(new Date(check))
		borderDays.reverse()
		let streak = 0
		let offsetRangeIndex = 0
		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]
			const actionDate = new Date(action.date)
			if (!borderDays[i] || !borderDays[i + 1]) break
			if (actionDate.getTime() <= borderDays[i + offsetRangeIndex].getTime() && actionDate.getTime() > borderDays[i + 1 + offsetRangeIndex].getTime()) streak++
			else if (i === 0 && offsetRangeIndex !== 1) {
				offsetRangeIndex = 1
				i--
				continue
			}
			else break
		}
		return streak
	} catch (error) {
		return 0
	}
})
