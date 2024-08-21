import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase';

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const keys = Object.keys(body);
	for (const key of keys) {
		body[key] = body[key] === "" ? undefined : body[key];
	}

	const supabase = serverSupabaseServiceRole<Database>(event)
	const { user } = event.context
	if (!user) return new Response("Unauthorized", { status: 401 });

	const { trackingCount, maximumHabits } = event.context.habitcap
	if ((trackingCount as number) >= maximumHabits) return new Response("You have reached the maximum number of habits you can track", { status: 400 });

	const { data: newHabit, error: libraryError } = await supabase.from('habits').insert({
		title: body.title,
		category: body.category,
		targetValue: body.targetValue,
		targetValueUnit: body.targetValueUnit,
		period: body.period,
		owner: user.id,
		restricted: !body.showInLibrary
	} as any).select("id").maybeSingle();
	if (libraryError || !newHabit) return new Response("Error saving habit", { status: 500 });

	const { error: trackError } = await supabase.from('habit-trackings').insert({
		source: newHabit.id,
		owner: user.id,
		id: body.overrideTrackingID,
		date: new Date(Date.now() + event.context.time_offset).toISOString().substring(0, 10),
	} as any)
	if (trackError) return new Response("Error tracking habit", { status: 500 });

	return true
})
