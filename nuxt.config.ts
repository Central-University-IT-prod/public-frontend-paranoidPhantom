// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	devtools: { enabled: true },
	modules: [
		'@nuxt/ui',
		'@nuxtjs/supabase',
		'@vite-pwa/nuxt'
	],
	supabase: {
		redirect: false
	},
	app: {
		pageTransition: {
			name: 'page',
			mode: 'out-in'
		}
	},
	css: [
		'assets/global.scss'
	],
	runtimeConfig: {
		public: {
			SUPABASE_URL: process.env.SUPABASE_URL,
			SUPABASE_KEY: process.env.SUPABASE_KEY
		},
		SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY
	},
	pwa: {
		includeAssets: ['favicon.ico', "apple-touch-icon.png"],
		manifest: {
			name: "Choco-Pie Лайф",
			short_name: "Choco-Pie Лайф",
			description: "Если ты сигма и хочешь следить за полезными привычками, то это приложение для тебя!",
			theme_color: '#2dd4bf',
			icons: [
				{
					src: "icons/512.png",
					sizes: "512x512",
					type: "image/png"
				},
				{
					src: "icons/144.png",
					sizes: "144x144",
					type: "image/png"
				},
				{
					src: "icons/192.png",
					sizes: "192x192",
					type: "image/png"
				},
				{
					src: "icons/64.png",
					sizes: "64x64",
					type: "image/png"
				}
			]
		},
		registerType: 'autoUpdate',
		workbox: {
			navigateFallback: "/",
			globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
			navigateFallbackDenylist: [/^\/*/]
		},
		devOptions: {
			enabled: process.dev,
			type: "module"
		}
	}
})
