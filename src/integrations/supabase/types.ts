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
      ai_usage_events: {
        Row: {
          cost_usd: number
          count: number
          created_at: string
          id: string
          month_key: string
          tokens: number
          usage_type: string
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          count?: number
          created_at?: string
          id?: string
          month_key: string
          tokens?: number
          usage_type: string
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          count?: number
          created_at?: string
          id?: string
          month_key?: string
          tokens?: number
          usage_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      client_copy_bank: {
        Row: {
          client_id: string | null
          copy_text: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string | null
          source: string
          tema: string | null
        }
        Insert: {
          client_id?: string | null
          copy_text: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string | null
          source?: string
          tema?: string | null
        }
        Update: {
          client_id?: string | null
          copy_text?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string | null
          source?: string
          tema?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_copy_bank_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_copy_bank_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "creative_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_editorials: {
        Row: {
          client_id: string
          created_at: string
          design_system_doc: string
          id: string
          updated_at: string
          visual_analysis: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          design_system_doc?: string
          id?: string
          updated_at?: string
          visual_analysis?: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          design_system_doc?: string
          id?: string
          updated_at?: string
          visual_analysis?: Json
        }
        Relationships: [
          {
            foreignKeyName: "client_editorials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pixels: {
        Row: {
          access_token: string
          client_id: string
          created_at: string
          id: string
          offline_event_set_id: string | null
          pixel_id: string
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string
          id?: string
          offline_event_set_id?: string | null
          pixel_id: string
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string
          id?: string
          offline_event_set_id?: string | null
          pixel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_pixels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          google_ads_access_token: string | null
          google_ads_customer_id: string | null
          google_ads_customer_name: string | null
          google_ads_last_sync_at: string | null
          google_ads_refresh_token: string | null
          google_ads_synced: boolean
          google_ads_token_expires_at: string | null
          id: string
          is_synced: boolean
          last_sync_at: string | null
          meta_access_token: string | null
          meta_ad_account_id: string | null
          meta_ad_account_name: string | null
          name: string
          token_expires_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          google_ads_access_token?: string | null
          google_ads_customer_id?: string | null
          google_ads_customer_name?: string | null
          google_ads_last_sync_at?: string | null
          google_ads_refresh_token?: string | null
          google_ads_synced?: boolean
          google_ads_token_expires_at?: string | null
          id?: string
          is_synced?: boolean
          last_sync_at?: string | null
          meta_access_token?: string | null
          meta_ad_account_id?: string | null
          meta_ad_account_name?: string | null
          name: string
          token_expires_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          google_ads_access_token?: string | null
          google_ads_customer_id?: string | null
          google_ads_customer_name?: string | null
          google_ads_last_sync_at?: string | null
          google_ads_refresh_token?: string | null
          google_ads_synced?: boolean
          google_ads_token_expires_at?: string | null
          id?: string
          is_synced?: boolean
          last_sync_at?: string | null
          meta_access_token?: string | null
          meta_ad_account_id?: string | null
          meta_ad_account_name?: string | null
          name?: string
          token_expires_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      creative_assets: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          filename: string | null
          id: string
          is_client_intelligence: boolean
          metadata: Json
          mime_type: string | null
          project_id: string | null
          size_bytes: number | null
          thumbnail_url: string | null
          type: string
          url: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          filename?: string | null
          id?: string
          is_client_intelligence?: boolean
          metadata?: Json
          mime_type?: string | null
          project_id?: string | null
          size_bytes?: number | null
          thumbnail_url?: string | null
          type: string
          url: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          filename?: string | null
          id?: string
          is_client_intelligence?: boolean
          metadata?: Json
          mime_type?: string | null
          project_id?: string | null
          size_bytes?: number | null
          thumbnail_url?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "creative_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_copy_variations: {
        Row: {
          angle: string | null
          avaliacao: Json
          created_at: string
          cta: string | null
          dados: string | null
          id: string
          justificativa: string | null
          label: string | null
          metadata: Json
          project_id: string
          selected: boolean
          source: string
          subtitulo: string | null
          titulo: string | null
        }
        Insert: {
          angle?: string | null
          avaliacao?: Json
          created_at?: string
          cta?: string | null
          dados?: string | null
          id?: string
          justificativa?: string | null
          label?: string | null
          metadata?: Json
          project_id: string
          selected?: boolean
          source: string
          subtitulo?: string | null
          titulo?: string | null
        }
        Update: {
          angle?: string | null
          avaliacao?: Json
          created_at?: string
          cta?: string | null
          dados?: string | null
          id?: string
          justificativa?: string | null
          label?: string | null
          metadata?: Json
          project_id?: string
          selected?: boolean
          source?: string
          subtitulo?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_copy_variations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "creative_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_outputs: {
        Row: {
          aspect_ratio: string | null
          asset_id: string | null
          created_at: string
          id: string
          image_url: string
          metadata: Json
          project_id: string
          prompt: string | null
          resolution: string | null
          source_output_id: string | null
          type: string
        }
        Insert: {
          aspect_ratio?: string | null
          asset_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          metadata?: Json
          project_id: string
          prompt?: string | null
          resolution?: string | null
          source_output_id?: string | null
          type: string
        }
        Update: {
          aspect_ratio?: string | null
          asset_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          metadata?: Json
          project_id?: string
          prompt?: string | null
          resolution?: string | null
          source_output_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_outputs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "creative_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "creative_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_outputs_source_output_id_fkey"
            columns: ["source_output_id"]
            isOneToOne: false
            referencedRelation: "creative_outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_project_state: {
        Row: {
          created_at: string
          id: string
          project_id: string
          state_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          state_json: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          state_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_project_state_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "creative_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_projects: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          current_stage: string | null
          id: string
          initial_prompt: string | null
          language: string
          model: string | null
          selected_aspect_ratio: string
          selected_resolution: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          id?: string
          initial_prompt?: string | null
          language?: string
          model?: string | null
          selected_aspect_ratio?: string
          selected_resolution?: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          id?: string
          initial_prompt?: string | null
          language?: string
          model?: string | null
          selected_aspect_ratio?: string
          selected_resolution?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_template_assets: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
          template_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          template_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_template_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "creative_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_template_assets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "creative_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_templates: {
        Row: {
          aspect_ratio: string
          base_prompt: string | null
          category: string | null
          client_id: string | null
          copy_structure: Json
          created_at: string
          created_by: string | null
          description: string | null
          design_system_doc: string | null
          id: string
          layout_structure: Json
          name: string
          negative_prompt: string | null
          niche: string | null
          preferred_resolution: string
          preview_url: string | null
          source_output_id: string | null
          source_project_id: string | null
          status: string
          style_metadata: Json
          tags: string[]
          updated_at: string
          usage_count: number
          visibility: string
        }
        Insert: {
          aspect_ratio?: string
          base_prompt?: string | null
          category?: string | null
          client_id?: string | null
          copy_structure?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          design_system_doc?: string | null
          id?: string
          layout_structure?: Json
          name: string
          negative_prompt?: string | null
          niche?: string | null
          preferred_resolution?: string
          preview_url?: string | null
          source_output_id?: string | null
          source_project_id?: string | null
          status?: string
          style_metadata?: Json
          tags?: string[]
          updated_at?: string
          usage_count?: number
          visibility?: string
        }
        Update: {
          aspect_ratio?: string
          base_prompt?: string | null
          category?: string | null
          client_id?: string | null
          copy_structure?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          design_system_doc?: string | null
          id?: string
          layout_structure?: Json
          name?: string
          negative_prompt?: string | null
          niche?: string | null
          preferred_resolution?: string
          preview_url?: string | null
          source_output_id?: string | null
          source_project_id?: string | null
          status?: string
          style_metadata?: Json
          tags?: string[]
          updated_at?: string
          usage_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_templates_source_output_id_fkey"
            columns: ["source_output_id"]
            isOneToOne: false
            referencedRelation: "creative_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_templates_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "creative_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_conversions: {
        Row: {
          age: number | null
          client_id: string
          conversion_date: string
          country: string | null
          created_at: string
          ct: string | null
          currency: string
          dob: string | null
          doby: string | null
          email: string | null
          error_message: string | null
          event_name: string
          fn: string | null
          gen: string | null
          id: string
          ln: string | null
          meta_event_id: string | null
          phone: string | null
          send_status: string
          value: number | null
          zip: string | null
        }
        Insert: {
          age?: number | null
          client_id: string
          conversion_date: string
          country?: string | null
          created_at?: string
          ct?: string | null
          currency?: string
          dob?: string | null
          doby?: string | null
          email?: string | null
          error_message?: string | null
          event_name?: string
          fn?: string | null
          gen?: string | null
          id?: string
          ln?: string | null
          meta_event_id?: string | null
          phone?: string | null
          send_status?: string
          value?: number | null
          zip?: string | null
        }
        Update: {
          age?: number | null
          client_id?: string
          conversion_date?: string
          country?: string | null
          created_at?: string
          ct?: string | null
          currency?: string
          dob?: string | null
          doby?: string | null
          email?: string | null
          error_message?: string | null
          event_name?: string
          fn?: string | null
          gen?: string | null
          id?: string
          ln?: string | null
          meta_event_id?: string | null
          phone?: string | null
          send_status?: string
          value?: number | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_conversions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      social_profiles: {
        Row: {
          avatar_url: string | null
          handle: string
          nome: string
          template_padrao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          handle?: string
          nome?: string
          template_padrao?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          handle?: string
          nome?: string
          template_padrao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_dashboard_prefs: {
        Row: {
          client_id: string
          created_at: string
          id: string
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dashboard_prefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "admin" | "client"
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
      app_role: ["admin", "client"],
    },
  },
} as const
