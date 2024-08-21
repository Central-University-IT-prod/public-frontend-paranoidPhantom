import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/supabase';

export default defineEventHandler(async (event) => {

	const supabase = serverSupabaseServiceRole<Database>(event)
	const { user } = event.context
	if (!user) return new Response("Unauthorized", { status: 401 });

	const body = await readBody(event)
	const query = getQuery(event)

	if (body.id) {
		if (query.stop) {
			const { error } = await supabase.from('habit-trackings').update({
				stopped: true
			}).eq("id", body.id)
			if (error) return new Response(error.message, { status: 500 })
		} else {
			const { error } = await supabase.from('habit-trackings').delete().eq("id", body.id)
			if (error) return new Response(error.message, { status: 500 })
		}
	} else return new Response("No tracking id provided", { status: 400 })

	return true
})
