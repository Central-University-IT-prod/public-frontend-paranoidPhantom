import type { Database } from "./supabase";

export type DatabaseRow<Row extends keyof Database["public"]["Tables"]> =
	Database["public"]["Tables"][Row]["Row"];