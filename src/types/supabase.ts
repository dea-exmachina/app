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
      bender_identities: {
        Row: {
          context_files: string[] | null
          created_at: string | null
          description: string | null
          expertise: string[]
          id: string
          name: string
          platforms: string[]
          project_count: number | null
          slug: string
          system_prompt: string | null
        }
        Insert: {
          context_files?: string[] | null
          created_at?: string | null
          description?: string | null
          expertise: string[]
          id?: string
          name: string
          platforms: string[]
          project_count?: number | null
          slug: string
          system_prompt?: string | null
        }
        Update: {
          context_files?: string[] | null
          created_at?: string | null
          description?: string | null
          expertise?: string[]
          id?: string
          name?: string
          platforms?: string[]
          project_count?: number | null
          slug?: string
          system_prompt?: string | null
        }
        Relationships: []
      }
      bender_platforms: {
        Row: {
          config_location: string | null
          context_directory: string | null
          cost_tier: string | null
          id: string
          interface: string | null
          limitations: string[] | null
          models: string[] | null
          name: string
          slug: string
          status: string
          strengths: string[] | null
        }
        Insert: {
          config_location?: string | null
          context_directory?: string | null
          cost_tier?: string | null
          id?: string
          interface?: string | null
          limitations?: string[] | null
          models?: string[] | null
          name: string
          slug: string
          status?: string
          strengths?: string[] | null
        }
        Update: {
          config_location?: string | null
          context_directory?: string | null
          cost_tier?: string | null
          id?: string
          interface?: string | null
          limitations?: string[] | null
          models?: string[] | null
          name?: string
          slug?: string
          status?: string
          strengths?: string[] | null
        }
        Relationships: []
      }
      bender_tasks: {
        Row: {
          acceptance_criteria: string[] | null
          bender_role: string | null
          branch: string | null
          created_at: string | null
          execution_notes: string | null
          id: string
          markdown_path: string | null
          overview: string | null
          priority: string | null
          project_id: string
          requirements: string[] | null
          review_decision: string | null
          review_feedback: string | null
          status: string
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          acceptance_criteria?: string[] | null
          bender_role?: string | null
          branch?: string | null
          created_at?: string | null
          execution_notes?: string | null
          id?: string
          markdown_path?: string | null
          overview?: string | null
          priority?: string | null
          project_id: string
          requirements?: string[] | null
          review_decision?: string | null
          review_feedback?: string | null
          status?: string
          task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          acceptance_criteria?: string[] | null
          bender_role?: string | null
          branch?: string | null
          created_at?: string | null
          execution_notes?: string | null
          id?: string
          markdown_path?: string | null
          overview?: string | null
          priority?: string | null
          project_id?: string
          requirements?: string[] | null
          review_decision?: string | null
          review_feedback?: string | null
          status?: string
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bender_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bender_teams: {
        Row: {
          branch_strategy: string | null
          created_at: string | null
          id: string
          markdown_path: string | null
          name: string
          project_id: string | null
          sequencing: string | null
        }
        Insert: {
          branch_strategy?: string | null
          created_at?: string | null
          id?: string
          markdown_path?: string | null
          name: string
          project_id?: string | null
          sequencing?: string | null
        }
        Update: {
          branch_strategy?: string | null
          created_at?: string | null
          id?: string
          markdown_path?: string | null
          name?: string
          project_id?: string | null
          sequencing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bender_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_boards: {
        Row: {
          created_at: string | null
          id: string
          lanes: Json
          markdown_path: string | null
          name: string
          project_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lanes: Json
          markdown_path?: string | null
          name: string
          project_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lanes?: Json
          markdown_path?: string | null
          name?: string
          project_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_cards: {
        Row: {
          board_id: string
          card_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          lane: string
          parent_card_id: string | null
          position: number | null
          project_id: string
          raw_markdown: string | null
          source: string | null
          started_at: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          board_id: string
          card_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lane: string
          parent_card_id?: string | null
          position?: number | null
          project_id: string
          raw_markdown?: string | null
          source?: string | null
          started_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          board_id?: string
          card_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lane?: string
          parent_card_id?: string | null
          position?: number | null
          project_id?: string
          raw_markdown?: string | null
          source?: string | null
          started_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          in_reply_to: string | null
          project_id: string | null
          read: boolean | null
          sender: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          in_reply_to?: string | null
          project_id?: string | null
          read?: boolean | null
          sender: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          in_reply_to?: string | null
          project_id?: string | null
          read?: boolean | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_in_reply_to_fkey"
            columns: ["in_reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_benders: {
        Row: {
          context_notes: string | null
          created_at: string | null
          id: string
          identity_id: string
          invocation: string | null
          project_id: string
          role: string | null
          status: string | null
        }
        Insert: {
          context_notes?: string | null
          created_at?: string | null
          id?: string
          identity_id: string
          invocation?: string | null
          project_id: string
          role?: string | null
          status?: string | null
        }
        Update: {
          context_notes?: string | null
          created_at?: string | null
          id?: string
          identity_id?: string
          invocation?: string | null
          project_id?: string
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_benders_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "bender_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_benders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          dashboard_layout: Json
          description: string | null
          icon: string | null
          id: string
          initial_data_schema: Json | null
          name: string
          project_type: string
          setup_questions: Json | null
          slug: string
          starter_workflows: string[] | null
          suggested_benders: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dashboard_layout: Json
          description?: string | null
          icon?: string | null
          id?: string
          initial_data_schema?: Json | null
          name: string
          project_type: string
          setup_questions?: Json | null
          slug: string
          starter_workflows?: string[] | null
          suggested_benders?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dashboard_layout?: Json
          description?: string | null
          icon?: string | null
          id?: string
          initial_data_schema?: Json | null
          name?: string
          project_type?: string
          setup_questions?: Json | null
          slug?: string
          starter_workflows?: string[] | null
          suggested_benders?: Json | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          dashboard_layout: Json | null
          git_repo_url: string | null
          id: string
          integrations: Json | null
          name: string
          repo_path: string | null
          settings: Json | null
          slug: string
          status: string
          supabase_branch_id: string | null
          supabase_project_id: string | null
          template_id: string | null
          type: string
          updated_at: string | null
          vercel_project_id: string | null
          vercel_team_id: string | null
        }
        Insert: {
          created_at?: string | null
          dashboard_layout?: Json | null
          git_repo_url?: string | null
          id?: string
          integrations?: Json | null
          name: string
          repo_path?: string | null
          settings?: Json | null
          slug: string
          status?: string
          supabase_branch_id?: string | null
          supabase_project_id?: string | null
          template_id?: string | null
          type: string
          updated_at?: string | null
          vercel_project_id?: string | null
          vercel_team_id?: string | null
        }
        Update: {
          created_at?: string | null
          dashboard_layout?: Json | null
          git_repo_url?: string | null
          id?: string
          integrations?: Json | null
          name?: string
          repo_path?: string | null
          settings?: Json | null
          slug?: string
          status?: string
          supabase_branch_id?: string | null
          supabase_project_id?: string | null
          template_id?: string | null
          type?: string
          updated_at?: string | null
          vercel_project_id?: string | null
          vercel_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_template"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learnings: {
        Row: {
          category: string
          confidence: number | null
          created_at: string | null
          evidence_count: number | null
          id: string
          key: string
          project_id: string | null
          updated_at: string | null
          value: Json
        }
        Insert: {
          category: string
          confidence?: number | null
          created_at?: string | null
          evidence_count?: number | null
          id?: string
          key: string
          project_id?: string | null
          updated_at?: string | null
          value: Json
        }
        Update: {
          category?: string
          confidence?: number | null
          created_at?: string | null
          evidence_count?: number | null
          id?: string
          key?: string
          project_id?: string | null
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_learnings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          id: string
          markdown_path: string
          prerequisites: string[] | null
          project_id: string | null
          purpose: string | null
          sections: Json | null
          slug: string
          status: string | null
          title: string
          trigger: string | null
          updated_at: string | null
          workflow_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          markdown_path: string
          prerequisites?: string[] | null
          project_id?: string | null
          purpose?: string | null
          sections?: Json | null
          slug: string
          status?: string | null
          title: string
          trigger?: string | null
          updated_at?: string | null
          workflow_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          markdown_path?: string
          prerequisites?: string[] | null
          project_id?: string | null
          purpose?: string | null
          sections?: Json | null
          slug?: string
          status?: string | null
          title?: string
          trigger?: string | null
          updated_at?: string | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
