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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      customer_notes: {
        Row: {
          body: string
          created_at: string
          customer_id: string
          id: string
          occurred_at: string
          owner_id: string
          title: string
          type: Database["public"]["Enums"]["note_type"]
        }
        Insert: {
          body: string
          created_at?: string
          customer_id: string
          id?: string
          occurred_at?: string
          owner_id: string
          title?: string
          type?: Database["public"]["Enums"]["note_type"]
        }
        Update: {
          body?: string
          created_at?: string
          customer_id?: string
          id?: string
          occurred_at?: string
          owner_id?: string
          title?: string
          type?: Database["public"]["Enums"]["note_type"]
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          billing_state: string | null
          billing_street: string | null
          company_size: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          last_contacted_at: string | null
          name: string
          owner_id: string
          phone: string | null
          primary_email: string | null
          primary_first_name: string | null
          primary_last_name: string | null
          primary_phone: string | null
          primary_title: string | null
          status: Database["public"]["Enums"]["customer_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          billing_street?: string | null
          company_size?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          name: string
          owner_id: string
          phone?: string | null
          primary_email?: string | null
          primary_first_name?: string | null
          primary_last_name?: string | null
          primary_phone?: string | null
          primary_title?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          billing_street?: string | null
          company_size?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          primary_email?: string | null
          primary_first_name?: string | null
          primary_last_name?: string | null
          primary_phone?: string | null
          primary_title?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          api_key_hash: string
          created_at: string
          default_status: Database["public"]["Enums"]["lead_status"]
          enabled: boolean
          id: string
          last_rotated_at: string | null
          name: string
          owner_id: string
          source_label: string
          updated_at: string
        }
        Insert: {
          api_key_hash: string
          created_at?: string
          default_status?: Database["public"]["Enums"]["lead_status"]
          enabled?: boolean
          id?: string
          last_rotated_at?: string | null
          name: string
          owner_id: string
          source_label?: string
          updated_at?: string
        }
        Update: {
          api_key_hash?: string
          created_at?: string
          default_status?: Database["public"]["Enums"]["lead_status"]
          enabled?: boolean
          id?: string
          last_rotated_at?: string | null
          name?: string
          owner_id?: string
          source_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          lead_id: string
          occurred_at: string
          owner_id: string
          title: string
          type: Database["public"]["Enums"]["note_type"]
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lead_id: string
          occurred_at?: string
          owner_id: string
          title?: string
          type?: Database["public"]["Enums"]["note_type"]
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
          occurred_at?: string
          owner_id?: string
          title?: string
          type?: Database["public"]["Enums"]["note_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          company_size: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          industry: string | null
          last_contacted_at: string | null
          last_name: string | null
          owner_id: string
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          company?: string | null
          company_size?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          owner_id: string
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          company?: string | null
          company_size?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          owner_id?: string
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          /** Present after migration `20260321120000_profiles_company_logo`; may be absent on older DBs */
          company_logo_path?: string | null
          company_name: string | null
          company_size: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          industry: string | null
          last_name: string | null
          /** Set when user completes first-run onboarding in the CRM */
          onboarding_completed_at: string | null
          phone: string | null
          tier: Database["public"]["Enums"]["account_tier"]
          updated_at: string
          website: string | null
        }
        Insert: {
          company_logo_path?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          industry?: string | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          tier?: Database["public"]["Enums"]["account_tier"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_logo_path?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          tier?: Database["public"]["Enums"]["account_tier"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      service_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          owner_id: string
          service_id: string
          storage_bucket: string
          storage_path: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          owner_id: string
          service_id: string
          storage_bucket?: string
          storage_path: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          owner_id?: string
          service_id?: string
          storage_bucket?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_attachments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      service_entries: {
        Row: {
          created_at: string
          customer_id: string
          description: string
          id: string
          owner_id: string
          price_amount: number | null
          price_currency: string
          service_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description: string
          id?: string
          owner_id: string
          price_amount?: number | null
          price_currency?: string
          service_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          owner_id?: string
          price_amount?: number | null
          price_currency?: string
          service_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_tier: "Freemium" | "Basic" | "Advanced" | "Enterprise"
      customer_status: "Prospect" | "Active" | "OnHold" | "Churned"
      lead_status:
        | "New"
        | "Contacted"
        | "Qualified"
        | "Unqualified"
        | "ClosedWon"
        | "ClosedLost"
      note_type: "note" | "call" | "email_sent" | "meeting" | "other"
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
      account_tier: ["Freemium", "Basic", "Advanced", "Enterprise"],
      customer_status: ["Prospect", "Active", "OnHold", "Churned"],
      lead_status: [
        "New",
        "Contacted",
        "Qualified",
        "Unqualified",
        "ClosedWon",
        "ClosedLost",
      ],
      note_type: ["note", "call", "email_sent", "meeting", "other"],
    },
  },
} as const
