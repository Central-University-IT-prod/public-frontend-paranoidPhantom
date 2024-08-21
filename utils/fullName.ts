import type { profile } from "~/types/profile"
export const useFullName = (profile: profile) => {
	return `${profile.first_name} ${profile.last_name}`
}
