export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      fhir_encounters: {
        Row: {
          class_code: string
          class_display: string | null
          class_system: string | null
          created_at: string
          created_by: string | null
          id: string
          location_display: string | null
          period_end: string | null
          period_start: string | null
          priority_code: string | null
          priority_display: string | null
          priority_system: string | null
          reason_text: string | null
          resource_type: string
          service_provider: string | null
          status: string
          subject_id: string
          type_code: string | null
          type_display: string | null
          type_system: string | null
          updated_at: string
        }
        Insert: {
          class_code: string
          class_display?: string | null
          class_system?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_display?: string | null
          period_end?: string | null
          period_start?: string | null
          priority_code?: string | null
          priority_display?: string | null
          priority_system?: string | null
          reason_text?: string | null
          resource_type?: string
          service_provider?: string | null
          status: string
          subject_id: string
          type_code?: string | null
          type_display?: string | null
          type_system?: string | null
          updated_at?: string
        }
        Update: {
          class_code?: string
          class_display?: string | null
          class_system?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_display?: string | null
          period_end?: string | null
          period_start?: string | null
          priority_code?: string | null
          priority_display?: string | null
          priority_system?: string | null
          reason_text?: string | null
          resource_type?: string
          service_provider?: string | null
          status?: string
          subject_id?: string
          type_code?: string | null
          type_display?: string | null
          type_system?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fhir_encounters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "fhir_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      fhir_observations: {
        Row: {
          category_code: string | null
          category_display: string | null
          category_system: string | null
          code_code: string
          code_display: string | null
          code_system: string | null
          created_at: string
          created_by: string | null
          data_absent_reason: string | null
          effective_datetime: string | null
          encounter_id: string | null
          id: string
          interpretation_code: string | null
          interpretation_display: string | null
          issued: string | null
          note: string | null
          performer_reference: string | null
          performer_type: string | null
          resource_type: string
          status: string
          subject_id: string
          updated_at: string
          value_quantity_code: string | null
          value_quantity_system: string | null
          value_quantity_unit: string | null
          value_quantity_value: number | null
          value_string: string | null
        }
        Insert: {
          category_code?: string | null
          category_display?: string | null
          category_system?: string | null
          code_code: string
          code_display?: string | null
          code_system?: string | null
          created_at?: string
          created_by?: string | null
          data_absent_reason?: string | null
          effective_datetime?: string | null
          encounter_id?: string | null
          id?: string
          interpretation_code?: string | null
          interpretation_display?: string | null
          issued?: string | null
          note?: string | null
          performer_reference?: string | null
          performer_type?: string | null
          resource_type?: string
          status: string
          subject_id: string
          updated_at?: string
          value_quantity_code?: string | null
          value_quantity_system?: string | null
          value_quantity_unit?: string | null
          value_quantity_value?: number | null
          value_string?: string | null
        }
        Update: {
          category_code?: string | null
          category_display?: string | null
          category_system?: string | null
          code_code?: string
          code_display?: string | null
          code_system?: string | null
          created_at?: string
          created_by?: string | null
          data_absent_reason?: string | null
          effective_datetime?: string | null
          encounter_id?: string | null
          id?: string
          interpretation_code?: string | null
          interpretation_display?: string | null
          issued?: string | null
          note?: string | null
          performer_reference?: string | null
          performer_type?: string | null
          resource_type?: string
          status?: string
          subject_id?: string
          updated_at?: string
          value_quantity_code?: string | null
          value_quantity_system?: string | null
          value_quantity_unit?: string | null
          value_quantity_value?: number | null
          value_string?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fhir_observations_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "fhir_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fhir_observations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "fhir_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      fhir_patients: {
        Row: {
          active: boolean
          address_city: string | null
          address_country: string | null
          address_line: string | null
          address_postal_code: string | null
          address_state: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          gender: string | null
          id: string
          identifier_system: string | null
          identifier_value: string | null
          managing_organization: string | null
          name_family: string
          name_given: string[] | null
          resource_type: string
          telecom_system: string | null
          telecom_value: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_city?: string | null
          address_country?: string | null
          address_line?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          gender?: string | null
          id?: string
          identifier_system?: string | null
          identifier_value?: string | null
          managing_organization?: string | null
          name_family: string
          name_given?: string[] | null
          resource_type?: string
          telecom_system?: string | null
          telecom_value?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_city?: string | null
          address_country?: string | null
          address_line?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          gender?: string | null
          id?: string
          identifier_system?: string | null
          identifier_value?: string | null
          managing_organization?: string | null
          name_family?: string
          name_given?: string[] | null
          resource_type?: string
          telecom_system?: string | null
          telecom_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "clinician" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["clinician", "admin"],
    },
  },
} as const
