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
      airlines: {
        Row: {
          active: boolean | null
          category: string | null
          country: string | null
          created_at: string | null
          date_from: string | null
          date_to: string | null
          iata_code: string | null
          id: string
          last_policy_update: string | null
          logo_url: string | null
          name: string
          phone_number: string | null
          region: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          iata_code?: string | null
          id?: string
          last_policy_update?: string | null
          logo_url?: string | null
          name: string
          phone_number?: string | null
          region?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          iata_code?: string | null
          id?: string
          last_policy_update?: string | null
          logo_url?: string | null
          name?: string
          phone_number?: string | null
          region?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      airports: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          iata_code: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          iata_code: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          iata_code?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      country_policies: {
        Row: {
          additional_notes: string | null
          country_code: string
          created_at: string | null
          description: string | null
          documentation_needed: string[] | null
          fees: Json | null
          id: string
          last_updated: string | null
          policy_type: Database["public"]["Enums"]["policy_type"]
          policy_url: string | null
          quarantine_requirements: string | null
          requirements: string[] | null
          restrictions: Json | null
          title: string
          updated_at: string | null
          vaccination_requirements: string[] | null
        }
        Insert: {
          additional_notes?: string | null
          country_code: string
          created_at?: string | null
          description?: string | null
          documentation_needed?: string[] | null
          fees?: Json | null
          id?: string
          last_updated?: string | null
          policy_type: Database["public"]["Enums"]["policy_type"]
          policy_url?: string | null
          quarantine_requirements?: string | null
          requirements?: string[] | null
          restrictions?: Json | null
          title: string
          updated_at?: string | null
          vaccination_requirements?: string[] | null
        }
        Update: {
          additional_notes?: string | null
          country_code?: string
          created_at?: string | null
          description?: string | null
          documentation_needed?: string[] | null
          fees?: Json | null
          id?: string
          last_updated?: string | null
          policy_type?: Database["public"]["Enums"]["policy_type"]
          policy_url?: string | null
          quarantine_requirements?: string | null
          requirements?: string[] | null
          restrictions?: Json | null
          title?: string
          updated_at?: string | null
          vaccination_requirements?: string[] | null
        }
        Relationships: []
      }
      pet_policies: {
        Row: {
          airline_id: string | null
          breed_restrictions: string[] | null
          carrier_requirements: string | null
          created_at: string | null
          documentation_needed: string[] | null
          fees: Json | null
          id: string
          pet_types_allowed: string[] | null
          policy_url: string | null
          size_restrictions: Json | null
          temperature_restrictions: string | null
          updated_at: string | null
        }
        Insert: {
          airline_id?: string | null
          breed_restrictions?: string[] | null
          carrier_requirements?: string | null
          created_at?: string | null
          documentation_needed?: string[] | null
          fees?: Json | null
          id?: string
          pet_types_allowed?: string[] | null
          policy_url?: string | null
          size_restrictions?: Json | null
          temperature_restrictions?: string | null
          updated_at?: string | null
        }
        Update: {
          airline_id?: string | null
          breed_restrictions?: string[] | null
          carrier_requirements?: string | null
          created_at?: string | null
          documentation_needed?: string[] | null
          fees?: Json | null
          id?: string
          pet_types_allowed?: string[] | null
          policy_url?: string | null
          size_restrictions?: Json | null
          temperature_restrictions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_policies_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: true
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_profiles: {
        Row: {
          age: number | null
          breed: string | null
          created_at: string | null
          documents: Json | null
          id: string
          name: string
          type: string
          updated_at: string | null
          user_id: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          breed?: string | null
          created_at?: string | null
          documents?: Json | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          breed?: string | null
          created_at?: string | null
          documents?: Json | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          notification_preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          notification_preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          airline_id: string | null
          arrival_airport_id: string | null
          arrival_country: string | null
          created_at: string | null
          departure_airport_id: string | null
          departure_country: string | null
          id: string
          policy_variations: Json | null
          updated_at: string | null
        }
        Insert: {
          airline_id?: string | null
          arrival_airport_id?: string | null
          arrival_country?: string | null
          created_at?: string | null
          departure_airport_id?: string | null
          departure_country?: string | null
          id?: string
          policy_variations?: Json | null
          updated_at?: string | null
        }
        Update: {
          airline_id?: string | null
          arrival_airport_id?: string | null
          arrival_country?: string | null
          created_at?: string | null
          departure_airport_id?: string | null
          departure_country?: string | null
          id?: string
          policy_variations?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_arrival_airport_id_fkey"
            columns: ["arrival_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_departure_airport_id_fkey"
            columns: ["departure_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          search_criteria: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          search_criteria: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          search_criteria?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sync_progress: {
        Row: {
          created_at: string | null
          error_items: string[] | null
          id: string
          is_complete: boolean | null
          last_processed: string | null
          needs_continuation: boolean | null
          processed: number
          processed_items: string[] | null
          start_time: string | null
          total: number
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_items?: string[] | null
          id?: string
          is_complete?: boolean | null
          last_processed?: string | null
          needs_continuation?: boolean | null
          processed?: number
          processed_items?: string[] | null
          start_time?: string | null
          total?: number
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_items?: string[] | null
          id?: string
          is_complete?: boolean | null
          last_processed?: string | null
          needs_continuation?: boolean | null
          processed?: number
          processed_items?: string[] | null
          start_time?: string | null
          total?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_airlines_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_distinct_countries: {
        Args: Record<PropertyKey, never>
        Returns: {
          country: string
        }[]
      }
      has_role: {
        Args: {
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "site_manager" | "pet_lover"
      policy_type: "pet" | "live_animal"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
