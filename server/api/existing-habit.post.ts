import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase';

export default defineEventHandler(async (event) => {
	const { id } = getQuery(event)

	const supabase = serverSupabaseServiceRole<Database>(event)
	const { user } = event.context
	if (!user) return new Response("Unauthorized", { status: 401 });

	const { trackingCount, maximumHabits } = event.context.habitcap
	if ((trackingCount as number) >= maximumHabits) return new Response("You have reached the maximum number of habits you can track", { status: 400 });

	const { error: trackError } = await supabase.from('habit-trackings').insert({
		date: new Date(Date.now() + event.context.time_offset).toISOString().substring(0, 10),
		source: id,
		owner: user.id
	} as any)
	if (trackError) return new Response("Error tracking habit", { status: 500 });

	return true
})
