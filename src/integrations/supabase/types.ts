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
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      country_policies: {
        Row: {
          additional_notes: string | null
          all_blood_tests: string | null
          all_other_biological_tests: string | null
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
          required_ports_of_entry: string | null
          requirements: string[] | null
          restrictions: Json | null
          title: string
          updated_at: string | null
          vaccination_requirements: string[] | null
        }
        Insert: {
          additional_notes?: string | null
          all_blood_tests?: string | null
          all_other_biological_tests?: string | null
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
          required_ports_of_entry?: string | null
          requirements?: string[] | null
          restrictions?: Json | null
          title: string
          updated_at?: string | null
          vaccination_requirements?: string[] | null
        }
        Update: {
          additional_notes?: string | null
          all_blood_tests?: string | null
          all_other_biological_tests?: string | null
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
          required_ports_of_entry?: string | null
          requirements?: string[] | null
          restrictions?: Json | null
          title?: string
          updated_at?: string | null
          vaccination_requirements?: string[] | null
        }
        Relationships: []
      }
      customer_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          id: string
          plan_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          environment: string
          features: Json | null
          id: string
          name: string
          price: number
          stripe_price_id: string | null
          system_plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          environment?: string
          features?: Json | null
          id?: string
          name: string
          price: number
          stripe_price_id?: string | null
          system_plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          environment?: string
          features?: Json | null
          id?: string
          name?: string
          price?: number
          stripe_price_id?: string | null
          system_plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_system_plan_id_fkey"
            columns: ["system_plan_id"]
            isOneToOne: false
            referencedRelation: "system_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_policies: {
        Row: {
          airline_id: string | null
          breed_restrictions: string[] | null
          cabin_combined_weight_kg: number | null
          cabin_height_cm: number | null
          cabin_length_cm: number | null
          cabin_linear_dimensions_cm: number | null
          cabin_max_weight_kg: number | null
          cabin_width_cm: number | null
          cargo_combined_weight_kg: number | null
          cargo_height_cm: number | null
          cargo_length_cm: number | null
          cargo_linear_dimensions_cm: number | null
          cargo_max_weight_kg: number | null
          cargo_width_cm: number | null
          carrier_requirements: string | null
          carrier_requirements_cabin: string | null
          carrier_requirements_cargo: string | null
          created_at: string | null
          documentation_needed: string[] | null
          fees: Json | null
          id: string
          pet_types_allowed: string[] | null
          policy_url: string | null
          size_restrictions: Json | null
          temperature_restrictions: string | null
          updated_at: string | null
          weight_includes_carrier: boolean | null
        }
        Insert: {
          airline_id?: string | null
          breed_restrictions?: string[] | null
          cabin_combined_weight_kg?: number | null
          cabin_height_cm?: number | null
          cabin_length_cm?: number | null
          cabin_linear_dimensions_cm?: number | null
          cabin_max_weight_kg?: number | null
          cabin_width_cm?: number | null
          cargo_combined_weight_kg?: number | null
          cargo_height_cm?: number | null
          cargo_length_cm?: number | null
          cargo_linear_dimensions_cm?: number | null
          cargo_max_weight_kg?: number | null
          cargo_width_cm?: number | null
          carrier_requirements?: string | null
          carrier_requirements_cabin?: string | null
          carrier_requirements_cargo?: string | null
          created_at?: string | null
          documentation_needed?: string[] | null
          fees?: Json | null
          id?: string
          pet_types_allowed?: string[] | null
          policy_url?: string | null
          size_restrictions?: Json | null
          temperature_restrictions?: string | null
          updated_at?: string | null
          weight_includes_carrier?: boolean | null
        }
        Update: {
          airline_id?: string | null
          breed_restrictions?: string[] | null
          cabin_combined_weight_kg?: number | null
          cabin_height_cm?: number | null
          cabin_length_cm?: number | null
          cabin_linear_dimensions_cm?: number | null
          cabin_max_weight_kg?: number | null
          cabin_width_cm?: number | null
          cargo_combined_weight_kg?: number | null
          cargo_height_cm?: number | null
          cargo_length_cm?: number | null
          cargo_linear_dimensions_cm?: number | null
          cargo_max_weight_kg?: number | null
          cargo_width_cm?: number | null
          carrier_requirements?: string | null
          carrier_requirements_cabin?: string | null
          carrier_requirements_cargo?: string | null
          created_at?: string | null
          documentation_needed?: string[] | null
          fees?: Json | null
          id?: string
          pet_types_allowed?: string[] | null
          policy_url?: string | null
          size_restrictions?: Json | null
          temperature_restrictions?: string | null
          updated_at?: string | null
          weight_includes_carrier?: boolean | null
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
          chip_authority: string | null
          chip_number: string | null
          created_at: string | null
          documents: Json | null
          health_certificate_url: string | null
          id: string
          images: string[] | null
          international_health_certificate_url: string | null
          microchip_documentation_url: string | null
          name: string
          pet_passport_url: string | null
          rabies_vaccination_url: string | null
          type: string
          updated_at: string | null
          usda_endorsement_url: string | null
          user_id: string | null
          vaccinations_url: string | null
          veterinary_certificate_url: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          breed?: string | null
          chip_authority?: string | null
          chip_number?: string | null
          created_at?: string | null
          documents?: Json | null
          health_certificate_url?: string | null
          id?: string
          images?: string[] | null
          international_health_certificate_url?: string | null
          microchip_documentation_url?: string | null
          name: string
          pet_passport_url?: string | null
          rabies_vaccination_url?: string | null
          type: string
          updated_at?: string | null
          usda_endorsement_url?: string | null
          user_id?: string | null
          vaccinations_url?: string | null
          veterinary_certificate_url?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          breed?: string | null
          chip_authority?: string | null
          chip_number?: string | null
          created_at?: string | null
          documents?: Json | null
          health_certificate_url?: string | null
          id?: string
          images?: string[] | null
          international_health_certificate_url?: string | null
          microchip_documentation_url?: string | null
          name?: string
          pet_passport_url?: string | null
          rabies_vaccination_url?: string | null
          type?: string
          updated_at?: string | null
          usda_endorsement_url?: string | null
          user_id?: string | null
          vaccinations_url?: string | null
          veterinary_certificate_url?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      premium_field_settings: {
        Row: {
          created_at: string | null
          description: string | null
          field_name: string
          id: string
          is_premium: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          field_name: string
          id?: string
          is_premium?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          field_name?: string
          id?: string
          is_premium?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_format: string | null
          address_line1: string | null
          address_line2: string | null
          address_line3: string | null
          administrative_area: string | null
          avatar_url: string | null
          country_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          locality: string | null
          notification_preferences: Json | null
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          postal_code: string | null
          search_count: number | null
          updated_at: string | null
        }
        Insert: {
          address_format?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          administrative_area?: string | null
          avatar_url?: string | null
          country_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          locality?: string | null
          notification_preferences?: Json | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          postal_code?: string | null
          search_count?: number | null
          updated_at?: string | null
        }
        Update: {
          address_format?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          administrative_area?: string | null
          avatar_url?: string | null
          country_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          locality?: string | null
          notification_preferences?: Json | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          postal_code?: string | null
          search_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_role_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      route_searches: {
        Row: {
          created_at: string | null
          destination: string
          id: string
          origin: string
          search_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          destination: string
          id?: string
          origin: string
          search_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          destination?: string
          id?: string
          origin?: string
          search_date?: string
          updated_at?: string | null
          user_id?: string
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
      sample_files: {
        Row: {
          active: boolean | null
          created_at: string | null
          file_path: string
          id: string
          view_count: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          file_path: string
          id?: string
          view_count?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          file_path?: string
          id?: string
          view_count?: number | null
        }
        Relationships: []
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
      support_settings: {
        Row: {
          auto_reply_subject: string
          auto_reply_template: string
          created_at: string
          id: string
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_security: string | null
          smtp_username: string | null
          support_email: string
          updated_at: string
          use_smtp: boolean | null
        }
        Insert: {
          auto_reply_subject?: string
          auto_reply_template?: string
          created_at?: string
          id?: string
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_security?: string | null
          smtp_username?: string | null
          support_email?: string
          updated_at?: string
          use_smtp?: boolean | null
        }
        Update: {
          auto_reply_subject?: string
          auto_reply_template?: string
          created_at?: string
          id?: string
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_security?: string | null
          smtp_username?: string | null
          support_email?: string
          updated_at?: string
          use_smtp?: boolean | null
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          airline_code: string
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string | null
          id: string
          status: string
        }
        Insert: {
          airline_code: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string | null
          id?: string
          status: string
        }
        Update: {
          airline_code?: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      sync_progress: {
        Row: {
          batch_metrics: Json | null
          created_at: string | null
          error_details: Json | null
          error_items: string[] | null
          id: string
          is_complete: boolean | null
          last_processed: string | null
          needs_continuation: boolean | null
          processed: number
          processed_items: string[] | null
          resume_token: string | null
          start_time: string | null
          total: number
          type: string
          updated_at: string | null
        }
        Insert: {
          batch_metrics?: Json | null
          created_at?: string | null
          error_details?: Json | null
          error_items?: string[] | null
          id?: string
          is_complete?: boolean | null
          last_processed?: string | null
          needs_continuation?: boolean | null
          processed?: number
          processed_items?: string[] | null
          resume_token?: string | null
          start_time?: string | null
          total?: number
          type: string
          updated_at?: string | null
        }
        Update: {
          batch_metrics?: Json | null
          created_at?: string | null
          error_details?: Json | null
          error_items?: string[] | null
          id?: string
          is_complete?: boolean | null
          last_processed?: string | null
          needs_continuation?: boolean | null
          processed?: number
          processed_items?: string[] | null
          resume_token?: string | null
          start_time?: string | null
          total?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_search_unlimited: boolean
          name: Database["public"]["Enums"]["subscription_plan"]
          renews_monthly: boolean
          search_limit: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_search_unlimited?: boolean
          name: Database["public"]["Enums"]["subscription_plan"]
          renews_monthly?: boolean
          search_limit?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_search_unlimited?: boolean
          name?: Database["public"]["Enums"]["subscription_plan"]
          renews_monthly?: boolean
          search_limit?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      system_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Database["public"]["Enums"]["user_permission"][] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Database["public"]["Enums"]["user_permission"][] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Database["public"]["Enums"]["user_permission"][] | null
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
      get_airline_flights: {
        Args: { airline_iata: string }
        Returns: {
          carrierFsCode: string
          flightNumber: string
          departureTime: string
          arrivalTime: string
          arrivalCountry: string
          airlineName: string
        }[]
      }
      get_airlines_needing_policy_update: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
        }[]
      }
      get_distinct_countries: {
        Args: Record<PropertyKey, never>
        Returns: {
          country: string
        }[]
      }
      get_profile_with_role: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_system_plan_by_id: {
        Args: { plan_id: string }
        Returns: {
          created_at: string | null
          description: string | null
          id: string
          is_search_unlimited: boolean
          name: Database["public"]["Enums"]["subscription_plan"]
          renews_monthly: boolean
          search_limit: number
          updated_at: string | null
        }[]
      }
      get_system_plan_by_name: {
        Args: { plan_name: Database["public"]["Enums"]["subscription_plan"] }
        Returns: {
          created_at: string | null
          description: string | null
          id: string
          is_search_unlimited: boolean
          name: Database["public"]["Enums"]["subscription_plan"]
          renews_monthly: boolean
          search_limit: number
          updated_at: string | null
        }[]
      }
      get_system_plans: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string | null
          description: string | null
          id: string
          is_search_unlimited: boolean
          name: Database["public"]["Enums"]["subscription_plan"]
          renews_monthly: boolean
          search_limit: number
          updated_at: string | null
        }[]
      }
      get_system_role_by_id: {
        Args: { role_id: string }
        Returns: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Database["public"]["Enums"]["user_permission"][] | null
          updated_at: string | null
        }[]
      }
      get_system_role_by_name: {
        Args: { role_name: string }
        Returns: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Database["public"]["Enums"]["user_permission"][] | null
          updated_at: string | null
        }[]
      }
      get_system_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Database["public"]["Enums"]["user_permission"][] | null
          updated_at: string | null
        }[]
      }
      has_role: {
        Args: { user_id: string; role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      increment_view_count: {
        Args: { file_id: string }
        Returns: undefined
      }
      search_airports_insensitive: {
        Args: { search_term: string }
        Returns: {
          iata_code: string
          name: string
          city: string
          country: string
          search_score: number
        }[]
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
    }
    Enums: {
      app_role: "site_manager" | "pet_lover" | "pet_caddie"
      policy_type: "pet_arrival" | "pet_transit"
      premium_field_type:
        | "carrier_requirements"
        | "carrier_requirements_cabin"
        | "carrier_requirements_cargo"
        | "temperature_restrictions"
        | "policy_url"
        | "fees_cargo"
        | "fees_in_cabin"
        | "size_restrictions_cabin"
        | "pet_types_allowed"
        | "documentation_needed"
        | "breed_restrictions"
        | "size_restrictions_max_weight_cabin"
        | "size_restrictions_max_weight_cargo"
        | "size_restrictions_carrier_dimensions_cabin"
      subscription_plan: "free" | "premium" | "teams" | "personal"
      user_permission: "view_all_fields" | "view_restricted_fields"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["site_manager", "pet_lover", "pet_caddie"],
      policy_type: ["pet_arrival", "pet_transit"],
      premium_field_type: [
        "carrier_requirements",
        "carrier_requirements_cabin",
        "carrier_requirements_cargo",
        "temperature_restrictions",
        "policy_url",
        "fees_cargo",
        "fees_in_cabin",
        "size_restrictions_cabin",
        "pet_types_allowed",
        "documentation_needed",
        "breed_restrictions",
        "size_restrictions_max_weight_cabin",
        "size_restrictions_max_weight_cargo",
        "size_restrictions_carrier_dimensions_cabin",
      ],
      subscription_plan: ["free", "premium", "teams", "personal"],
      user_permission: ["view_all_fields", "view_restricted_fields"],
    },
  },
} as const
