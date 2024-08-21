export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      "habit-actions": {
        Row: {
          date: string
          id: number
          owner: string
          tracking_id: number
          value: number | null
        }
        Insert: {
          date?: string
          id?: number
          owner: string
          tracking_id: number
          value?: number | null
        }
        Update: {
          date?: string
          id?: number
          owner?: string
          tracking_id?: number
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_habit-actions_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_habit-actions_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "habit-trackings"
            referencedColumns: ["id"]
          },
        ]
      }
      "habit-trackings": {
        Row: {
          date: string | null
          id: number
          owner: string
          restricted: boolean
          source: number
          stopped: boolean
        }
        Insert: {
          date?: string | null
          id?: number
          owner: string
          restricted?: boolean
          source: number
          stopped?: boolean
        }
        Update: {
          date?: string | null
          id?: number
          owner?: string
          restricted?: boolean
          source?: number
          stopped?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "public_habit-trackings_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_tracked-habits_user_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category: string
          id: number
          owner: string | null
          period: Database["public"]["Enums"]["Time period"]
          restricted: boolean
          targetValue: number | null
          targetValueUnit: string | null
          title: string
        }
        Insert: {
          category: string
          id?: number
          owner?: string | null
          period?: Database["public"]["Enums"]["Time period"]
          restricted?: boolean
          targetValue?: number | null
          targetValueUnit?: string | null
          title: string
        }
        Update: {
          category?: string
          id?: number
          owner?: string | null
          period?: Database["public"]["Enums"]["Time period"]
          restricted?: boolean
          targetValue?: number | null
          targetValueUnit?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_habits_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          first_name: string | null
          id: string
          last_name: string | null
          money: number
          xp: number
          full_name: string | null
        }
        Insert: {
          first_name?: string | null
          id: string
          last_name?: string | null
          money?: number
          xp?: number
        }
        Update: {
          first_name?: string | null
          id?: string
          last_name?: string | null
          money?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          identifier: string
          money: number
          reason: string
          user: string
          xp: number
        }
        Insert: {
          identifier: string
          money?: number
          reason: string
          user: string
          xp?: number
        }
        Update: {
          identifier?: string
          money?: number
          reason?: string
          user?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_rewards_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "social-interactions": {
        Row: {
          created_at: string
          id: number
          interaction: Database["public"]["Enums"]["Social interaction"]
          owner: string
          target: string
        }
        Insert: {
          created_at?: string
          id?: number
          interaction: Database["public"]["Enums"]["Social interaction"]
          owner: string
          target: string
        }
        Update: {
          created_at?: string
          id?: number
          interaction?: Database["public"]["Enums"]["Social interaction"]
          owner?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_social-interactions_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_social-interactions_target_fkey"
            columns: ["target"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      full_name: {
        Args: {
          "": unknown
        }
        Returns: string
      }
    }
    Enums: {
      "Social interaction": "request" | "accept"
      "Time period": "daily" | "monthly" | "weekly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
