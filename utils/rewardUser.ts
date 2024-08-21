import type { User } from "@supabase/supabase-js"

export const useReward = async (reason: string, id: string, xp: number, money: number) => {
	const toast = useToast()
	const supabase = useSupabaseClient()
	const user = useSupabaseUser()
	const stats = useState<{
		xp: number;
		money: number;
	}>("g_stats")
	const level = useState<{
		current: number;
		next: number;
		min: number;
		max: number;
		value: number;
	}>("g_level")
	const { error } = await supabase.from("rewards").insert(
		{
			uid: (user.value as User).id,
			reason,
			identifier: id,
			xp,
			money,
		} as any)
	setTimeout(() => {
		if (error) return
		if (xp > 0) {
			const data = level.value
			toast.add({
				title: `Вам начислено ${xp}XP`,
				description: `Сейчас у вас ${data.current} уровень, а до ${data.next
					} уровня осталось ${data.max - data.value}XP`,
				icon: "fluent-emoji:sparkles",
				timeout: 5000,
				actions: [
					{
						label: "Мой уровень",
						to: `/profile/${(user.value as User).id}`,
					},
				],
			});
		}
		if (money > 0) {
			toast.add({
				title: "Вам начислены чокопай-койны",
				description: `Вы стали богаче на ${money} чокопай-койнов`,
				icon: "fluent-emoji:face-savoring-food",
				timeout: 5000,
				actions: [
					{
						label: "Магазин",
						to: `/store`,
					},
				],
			});
		}
	}, 2000);
}
