export default defineAppConfig({
	ui: {
		primary: "teal",
		gray: "neutral",
		icons: {
			dynamic: true
		}
	},
	global_icons: {
		no_avatar: "i-fluent-scan-person-48-filled"
	},
	site_name: "Choco-Pie Лайф",
	timePeriods: {
		daily: 24 * 60 * 60 * 1000,
		weekly: 7 * 24 * 60 * 60 * 1000,
		monthly: 30 * 24 * 60 * 60 * 1000,
	},

	dayPeriods: {
		daily: 1,
		weekly: 7,
		monthly: 30,
	},
	rewards: {
		xp: {
			tracking: 250,
		},
		money: {
			levelup: 20
		}
	}
})