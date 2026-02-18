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
      agent_health: {
        Row: {
          agent_name: string
          current_task: string | null
          id: string
          last_activity_at: string | null
          metrics: Json | null
          platform: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_name: string
          current_task?: string | null
          id?: string
          last_activity_at?: string | null
          metrics?: Json | null
          platform: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          current_task?: string | null
          id?: string
          last_activity_at?: string | null
          metrics?: Json | null
          platform?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      architecture_annotations: {
        Row: {
          annotation_type: string
          author: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          priority: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          target_id: string
          target_tier: string | null
          target_type: string
          updated_at: string | null
        }
        Insert: {
          annotation_type: string
          author: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          target_id: string
          target_tier?: string | null
          target_type: string
          updated_at?: string | null
        }
        Update: {
          annotation_type?: string
          author?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          target_id?: string
          target_tier?: string | null
          target_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      architecture_secrets: {
        Row: {
          component_id: string
          component_type: string
          created_at: string | null
          description: string | null
          id: string
          location: string
          metadata: Json | null
          required: boolean | null
          secret_type: string
          status: string | null
          variable_name: string
        }
        Insert: {
          component_id: string
          component_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          location: string
          metadata?: Json | null
          required?: boolean | null
          secret_type: string
          status?: string | null
          variable_name: string
        }
        Update: {
          component_id?: string
          component_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string
          metadata?: Json | null
          required?: boolean | null
          secret_type?: string
          status?: string | null
          variable_name?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          actor_type: string
          card_id: string | null
          category: string
          created_at: string
          entity_id: string
          entity_type: string
          event_id: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          project_id: string | null
          source: string
        }
        Insert: {
          action: string
          actor?: string
          actor_type?: string
          card_id?: string | null
          category: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_id?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          project_id?: string | null
          source?: string
        }
        Update: {
          action?: string
          actor?: string
          actor_type?: string
          card_id?: string | null
          category?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_id?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          project_id?: string | null
          source?: string
        }
        Relationships: []
      }
      bender_identities: {
        Row: {
          bender_name: string | null
          bender_slug: string | null
          brief: Json | null
          context_files: string[] | null
          created_at: string | null
          description: string | null
          discord_avatar_url: string | null
          discord_color: number | null
          display_name: string | null
          expertise: string[]
          id: string
          learnings: string | null
          lineage: string | null
          name: string
          platforms: string[]
          profile: Json | null
          project_count: number | null
          retired_at: string | null
          retired_reason: string | null
          slug: string
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          bender_name?: string | null
          bender_slug?: string | null
          brief?: Json | null
          context_files?: string[] | null
          created_at?: string | null
          description?: string | null
          discord_avatar_url?: string | null
          discord_color?: number | null
          display_name?: string | null
          expertise: string[]
          id?: string
          learnings?: string | null
          lineage?: string | null
          name: string
          platforms: string[]
          profile?: Json | null
          project_count?: number | null
          retired_at?: string | null
          retired_reason?: string | null
          slug: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          bender_name?: string | null
          bender_slug?: string | null
          brief?: Json | null
          context_files?: string[] | null
          created_at?: string | null
          description?: string | null
          discord_avatar_url?: string | null
          discord_color?: number | null
          display_name?: string | null
          expertise?: string[]
          id?: string
          learnings?: string | null
          lineage?: string | null
          name?: string
          platforms?: string[]
          profile?: Json | null
          project_count?: number | null
          retired_at?: string | null
          retired_reason?: string | null
          slug?: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bender_performance: {
        Row: {
          bender_name: string
          bender_slug: string
          deductions: Json | null
          ewma_snapshot: number | null
          id: string
          identity: string
          level: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          task_id: string
        }
        Insert: {
          bender_name: string
          bender_slug: string
          deductions?: Json | null
          ewma_snapshot?: number | null
          id?: string
          identity: string
          level?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score: number
          task_id: string
        }
        Update: {
          bender_name?: string
          bender_slug?: string
          deductions?: Json | null
          ewma_snapshot?: number | null
          id?: string
          identity?: string
          level?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          task_id?: string
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
          card_id: string | null
          context: string | null
          created_at: string | null
          deliverables: string | null
          execution_notes: string | null
          heartbeat_at: string | null
          id: string
          markdown_path: string | null
          member: string | null
          overview: string | null
          platform: string | null
          priority: string | null
          project_id: string
          requirements: string[] | null
          review_decision: string | null
          review_feedback: string | null
          score: number | null
          status: string
          target_repo: string | null
          task_id: string
          team_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acceptance_criteria?: string[] | null
          bender_role?: string | null
          branch?: string | null
          card_id?: string | null
          context?: string | null
          created_at?: string | null
          deliverables?: string | null
          execution_notes?: string | null
          heartbeat_at?: string | null
          id?: string
          markdown_path?: string | null
          member?: string | null
          overview?: string | null
          platform?: string | null
          priority?: string | null
          project_id: string
          requirements?: string[] | null
          review_decision?: string | null
          review_feedback?: string | null
          score?: number | null
          status?: string
          target_repo?: string | null
          task_id: string
          team_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acceptance_criteria?: string[] | null
          bender_role?: string | null
          branch?: string | null
          card_id?: string | null
          context?: string | null
          created_at?: string | null
          deliverables?: string | null
          execution_notes?: string | null
          heartbeat_at?: string | null
          id?: string
          markdown_path?: string | null
          member?: string | null
          overview?: string | null
          platform?: string | null
          priority?: string | null
          project_id?: string
          requirements?: string[] | null
          review_decision?: string | null
          review_feedback?: string | null
          score?: number | null
          status?: string
          target_repo?: string | null
          task_id?: string
          team_id?: string | null
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
          {
            foreignKeyName: "bender_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "bender_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bender_team_members: {
        Row: {
          context_file: string | null
          created_at: string | null
          id: string
          identity_id: string | null
          is_dea_led: boolean | null
          needs_worktree: boolean
          platform: string | null
          role: string
          sequencing: string | null
          team_id: string
        }
        Insert: {
          context_file?: string | null
          created_at?: string | null
          id?: string
          identity_id?: string | null
          is_dea_led?: boolean | null
          needs_worktree?: boolean
          platform?: string | null
          role: string
          sequencing?: string | null
          team_id: string
        }
        Update: {
          context_file?: string | null
          created_at?: string | null
          id?: string
          identity_id?: string | null
          is_dea_led?: boolean | null
          needs_worktree?: boolean
          platform?: string | null
          role?: string
          sequencing?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bender_team_members_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "bender_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bender_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "bender_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bender_teams: {
        Row: {
          branch_strategy: string | null
          created_at: string | null
          display_name: string | null
          file_ownership: Json
          id: string
          markdown_path: string | null
          members: Json
          name: string
          project_id: string | null
          sequencing: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          branch_strategy?: string | null
          created_at?: string | null
          display_name?: string | null
          file_ownership?: Json
          id?: string
          markdown_path?: string | null
          members?: Json
          name: string
          project_id?: string | null
          sequencing?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_strategy?: string | null
          created_at?: string | null
          display_name?: string | null
          file_ownership?: Json
          id?: string
          markdown_path?: string | null
          members?: Json
          name?: string
          project_id?: string | null
          sequencing?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bender_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "nexus_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      canvases: {
        Row: {
          created_at: string
          data: Json
          description: string | null
          id: string
          project_id: string | null
          thumbnail: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          description?: string | null
          id?: string
          project_id?: string | null
          thumbnail?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          description?: string | null
          id?: string
          project_id?: string | null
          thumbnail?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_messages: {
        Row: {
          actor: string
          card_id: string | null
          channel: string
          created_at: string
          embed: Json
          error_msg: string | null
          id: string
          message_type: string
          pg_net_request_id: number | null
          project_id: string | null
          status: string
        }
        Insert: {
          actor?: string
          card_id?: string | null
          channel: string
          created_at?: string
          embed: Json
          error_msg?: string | null
          id?: string
          message_type: string
          pg_net_request_id?: number | null
          project_id?: string | null
          status?: string
        }
        Update: {
          actor?: string
          card_id?: string | null
          channel?: string
          created_at?: string
          embed?: Json
          error_msg?: string | null
          id?: string
          message_type?: string
          pg_net_request_id?: number | null
          project_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "nexus_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_project_context: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          identity_id: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          identity_id?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          identity_id?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_project_context_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "bender_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_project_context_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_recommendations: {
        Row: {
          created_at: string | null
          id: string
          identity_id: string | null
          metadata: Json | null
          reason: string | null
          score: number | null
          task_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          identity_id?: string | null
          metadata?: Json | null
          reason?: string | null
          score?: number | null
          task_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          identity_id?: string | null
          metadata?: Json | null
          reason?: string | null
          score?: number | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_recommendations_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "bender_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_recommendations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          assigned_to: string | null
          content: string
          created: string
          created_at: string
          file_path: string | null
          file_size: number | null
          filename: string
          id: string
          linked_card_id: string | null
          mime_type: string | null
          priority: string | null
          project_id: string | null
          source: string
          status: string
          tags: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          content: string
          created?: string
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          filename: string
          id?: string
          linked_card_id?: string | null
          mime_type?: string | null
          priority?: string | null
          project_id?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          content?: string
          created?: string
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          linked_card_id?: string | null
          mime_type?: string | null
          priority?: string | null
          project_id?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_linked_card_id_fkey"
            columns: ["linked_card_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "nexus_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_constructs: {
        Row: {
          authority: string[]
          created_at: string | null
          entity: string
          expertise: string[]
          id: string
          module: string
          spec_path: string
          tier: string
        }
        Insert: {
          authority: string[]
          created_at?: string | null
          entity: string
          expertise: string[]
          id?: string
          module: string
          spec_path: string
          tier: string
        }
        Update: {
          authority?: string[]
          created_at?: string | null
          entity?: string
          expertise?: string[]
          id?: string
          module?: string
          spec_path?: string
          tier?: string
        }
        Relationships: []
      }
      model_library: {
        Row: {
          auto_route_eligible: boolean | null
          capabilities: string[] | null
          context_length: number | null
          cost_tier: number
          created_at: string | null
          display_name: string
          escalates_to: string | null
          host_type: string | null
          host_url: string | null
          id: string
          input_price_per_mtok: number | null
          is_active: boolean | null
          last_benchmarked_at: string | null
          latency_p50_ms: number | null
          model_id: string | null
          output_price_per_mtok: number | null
          provider: string
          slug: string
          strengths: string[] | null
          throughput_tps: number | null
          updated_at: string | null
          weaknesses: string[] | null
        }
        Insert: {
          auto_route_eligible?: boolean | null
          capabilities?: string[] | null
          context_length?: number | null
          cost_tier: number
          created_at?: string | null
          display_name: string
          escalates_to?: string | null
          host_type?: string | null
          host_url?: string | null
          id?: string
          input_price_per_mtok?: number | null
          is_active?: boolean | null
          last_benchmarked_at?: string | null
          latency_p50_ms?: number | null
          model_id?: string | null
          output_price_per_mtok?: number | null
          provider: string
          slug: string
          strengths?: string[] | null
          throughput_tps?: number | null
          updated_at?: string | null
          weaknesses?: string[] | null
        }
        Update: {
          auto_route_eligible?: boolean | null
          capabilities?: string[] | null
          context_length?: number | null
          cost_tier?: number
          created_at?: string | null
          display_name?: string
          escalates_to?: string | null
          host_type?: string | null
          host_url?: string | null
          id?: string
          input_price_per_mtok?: number | null
          is_active?: boolean | null
          last_benchmarked_at?: string | null
          latency_p50_ms?: number | null
          model_id?: string | null
          output_price_per_mtok?: number | null
          provider?: string
          slug?: string
          strengths?: string[] | null
          throughput_tps?: number | null
          updated_at?: string | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "model_library_escalates_to_fkey"
            columns: ["escalates_to"]
            isOneToOne: false
            referencedRelation: "model_library"
            referencedColumns: ["slug"]
          },
        ]
      }
      nexus_agent_sessions: {
        Row: {
          agent: string
          card_id: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          model: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          agent: string
          card_id?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          agent?: string
          card_id?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexus_agent_sessions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_alerts: {
        Row: {
          acknowledged_at: string | null
          card_id: string | null
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          resolved_at: string | null
          severity: string
          source: string
          status: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          card_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          source: string
          status?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          card_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_alerts_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_card_reopens: {
        Row: {
          card_id: string
          created_at: string
          id: string
          reason: string | null
          reopened_from: string
          reopened_to: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reopened_from?: string
          reopened_to?: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reopened_from?: string
          reopened_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_card_reopens_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_cards: {
        Row: {
          assigned_model: string | null
          assigned_to: string | null
          bender_lane: string | null
          blocked_by: string[] | null
          bypass_justification: string | null
          card_id: string
          card_type: string
          completed_at: string | null
          created_at: string | null
          delegation_bypassed: boolean | null
          delegation_justification: string | null
          delegation_tag: string
          discord_thread_id: string | null
          due_date: string | null
          id: string
          lane: string
          lane_changes: number | null
          metadata: Json | null
          parent_id: string | null
          priority: string | null
          project_id: string | null
          ready_for_production: boolean | null
          source: string | null
          sprint_id: string | null
          subtasks: Json | null
          summary: string | null
          tags: string[] | null
          test_notes: string | null
          title: string
          updated_at: string | null
          version: number
          workstream_id: string | null
        }
        Insert: {
          assigned_model?: string | null
          assigned_to?: string | null
          bender_lane?: string | null
          blocked_by?: string[] | null
          bypass_justification?: string | null
          card_id?: string
          card_type: string
          completed_at?: string | null
          created_at?: string | null
          delegation_bypassed?: boolean | null
          delegation_justification?: string | null
          delegation_tag?: string
          discord_thread_id?: string | null
          due_date?: string | null
          id?: string
          lane: string
          lane_changes?: number | null
          metadata?: Json | null
          parent_id?: string | null
          priority?: string | null
          project_id?: string | null
          ready_for_production?: boolean | null
          source?: string | null
          sprint_id?: string | null
          subtasks?: Json | null
          summary?: string | null
          tags?: string[] | null
          test_notes?: string | null
          title: string
          updated_at?: string | null
          version?: number
          workstream_id?: string | null
        }
        Update: {
          assigned_model?: string | null
          assigned_to?: string | null
          bender_lane?: string | null
          blocked_by?: string[] | null
          bypass_justification?: string | null
          card_id?: string
          card_type?: string
          completed_at?: string | null
          created_at?: string | null
          delegation_bypassed?: boolean | null
          delegation_justification?: string | null
          delegation_tag?: string
          discord_thread_id?: string | null
          due_date?: string | null
          id?: string
          lane?: string
          lane_changes?: number | null
          metadata?: Json | null
          parent_id?: string | null
          priority?: string | null
          project_id?: string | null
          ready_for_production?: boolean | null
          source?: string | null
          sprint_id?: string | null
          subtasks?: Json | null
          summary?: string | null
          tags?: string[] | null
          test_notes?: string | null
          title?: string
          updated_at?: string | null
          version?: number
          workstream_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexus_cards_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexus_cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "nexus_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexus_cards_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "nexus_sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexus_cards_workstream_id_fkey"
            columns: ["workstream_id"]
            isOneToOne: false
            referencedRelation: "nexus_workstreams"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_comments: {
        Row: {
          author: string
          card_id: string | null
          comment_type: string | null
          content: string
          created_at: string | null
          id: string
          is_pivot: boolean | null
          pivot_impact: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          author: string
          card_id?: string | null
          comment_type?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_pivot?: boolean | null
          pivot_impact?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          author?: string
          card_id?: string | null
          comment_type?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_pivot?: boolean | null
          pivot_impact?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexus_comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_context_packages: {
        Row: {
          assembled_at: string | null
          assembled_content: string | null
          assembled_files: string[] | null
          card_id: string | null
          id: string
          layers: Json
          stale: boolean | null
        }
        Insert: {
          assembled_at?: string | null
          assembled_content?: string | null
          assembled_files?: string[] | null
          card_id?: string | null
          id?: string
          layers: Json
          stale?: boolean | null
        }
        Update: {
          assembled_at?: string | null
          assembled_content?: string | null
          assembled_files?: string[] | null
          card_id?: string | null
          id?: string
          layers?: Json
          stale?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "nexus_context_packages_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_events: {
        Row: {
          actor: string
          card_id: string | null
          created_at: string | null
          event_type: string
          id: string
          payload: Json
        }
        Insert: {
          actor: string
          card_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
        }
        Update: {
          actor?: string
          card_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "nexus_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_lane_transitions: {
        Row: {
          created_at: string | null
          from_lane: string
          id: string
          lane_type: string
          to_lane: string
        }
        Insert: {
          created_at?: string | null
          from_lane: string
          id?: string
          lane_type: string
          to_lane: string
        }
        Update: {
          created_at?: string | null
          from_lane?: string
          id?: string
          lane_type?: string
          to_lane?: string
        }
        Relationships: []
      }
      nexus_locks: {
        Row: {
          acquired_at: string | null
          agent: string
          card_id: string | null
          expires_at: string | null
          id: string
          lock_type: string
          metadata: Json | null
          released_at: string | null
          target: string
        }
        Insert: {
          acquired_at?: string | null
          agent: string
          card_id?: string | null
          expires_at?: string | null
          id?: string
          lock_type: string
          metadata?: Json | null
          released_at?: string | null
          target: string
        }
        Update: {
          acquired_at?: string | null
          agent?: string
          card_id?: string | null
          expires_at?: string | null
          id?: string
          lock_type?: string
          metadata?: Json | null
          released_at?: string | null
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_locks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_projects: {
        Row: {
          card_id_prefix: string
          color: string | null
          created_at: string | null
          delegation_policy: string
          group_slug: string | null
          id: string
          lane_config: Json | null
          metadata: Json | null
          name: string
          next_card_number: number
          override_reason: string | null
          protected_paths: string[] | null
          repo_url: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          card_id_prefix: string
          color?: string | null
          created_at?: string | null
          delegation_policy?: string
          group_slug?: string | null
          id?: string
          lane_config?: Json | null
          metadata?: Json | null
          name: string
          next_card_number?: number
          override_reason?: string | null
          protected_paths?: string[] | null
          repo_url?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          card_id_prefix?: string
          color?: string | null
          created_at?: string | null
          delegation_policy?: string
          group_slug?: string | null
          id?: string
          lane_config?: Json | null
          metadata?: Json | null
          name?: string
          next_card_number?: number
          override_reason?: string | null
          protected_paths?: string[] | null
          repo_url?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nexus_routing_rules: {
        Row: {
          created_at: string | null
          id: string
          keyword: string
          priority: number | null
          project_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          keyword: string
          priority?: number | null
          project_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          keyword?: string
          priority?: number | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_routing_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "nexus_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_sprints: {
        Row: {
          created_at: string | null
          end_date: string
          goal: string | null
          id: string
          name: string
          start_date: string
          status: string
          velocity_actual: number | null
          velocity_target: number | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          goal?: string | null
          id?: string
          name: string
          start_date: string
          status?: string
          velocity_actual?: number | null
          velocity_target?: number | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          goal?: string | null
          id?: string
          name?: string
          start_date?: string
          status?: string
          velocity_actual?: number | null
          velocity_target?: number | null
        }
        Relationships: []
      }
      nexus_task_details: {
        Row: {
          acceptance_criteria: string | null
          actual_scope: string[] | null
          branch: string | null
          card_id: string | null
          constraints: string | null
          context_package_id: string | null
          created_at: string | null
          declared_scope: string[] | null
          deliverables: string | null
          execution_notes: string | null
          id: string
          overview: string | null
          references: string | null
          requirements: string | null
          review_decision: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          test_plan: string | null
          updated_at: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          actual_scope?: string[] | null
          branch?: string | null
          card_id?: string | null
          constraints?: string | null
          context_package_id?: string | null
          created_at?: string | null
          declared_scope?: string[] | null
          deliverables?: string | null
          execution_notes?: string | null
          id?: string
          overview?: string | null
          references?: string | null
          requirements?: string | null
          review_decision?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          test_plan?: string | null
          updated_at?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          actual_scope?: string[] | null
          branch?: string | null
          card_id?: string | null
          constraints?: string | null
          context_package_id?: string | null
          created_at?: string | null
          declared_scope?: string[] | null
          deliverables?: string | null
          execution_notes?: string | null
          id?: string
          overview?: string | null
          references?: string | null
          requirements?: string | null
          review_decision?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          test_plan?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_nexus_task_details_context_package"
            columns: ["context_package_id"]
            isOneToOne: false
            referencedRelation: "nexus_context_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexus_task_details_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_token_usage: {
        Row: {
          actor: string
          card_id: string | null
          cost_usd: number | null
          created_at: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          session_id: string | null
          total_tokens: number | null
        }
        Insert: {
          actor?: string
          card_id?: string | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          session_id?: string | null
          total_tokens?: number | null
        }
        Update: {
          actor?: string
          card_id?: string | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          session_id?: string | null
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nexus_token_usage_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nexus_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_workstreams: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string
          target_date: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          target_date?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          target_date?: string | null
        }
        Relationships: []
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
            referencedRelation: "nexus_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tech_stack: {
        Row: {
          category: string
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          project_id: string
          role: string | null
          updated_at: string | null
          url: string | null
          version: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          project_id: string
          role?: string | null
          updated_at?: string | null
          url?: string | null
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          project_id?: string
          role?: string | null
          updated_at?: string | null
          url?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tech_stack_project_id_fkey"
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
      project_workflows: {
        Row: {
          automated: boolean | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          project_id: string
          trigger_event: string | null
          updated_at: string | null
          workflow_path: string | null
        }
        Insert: {
          automated?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          project_id: string
          trigger_event?: string | null
          updated_at?: string | null
          workflow_path?: string | null
        }
        Update: {
          automated?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          project_id?: string
          trigger_event?: string | null
          updated_at?: string | null
          workflow_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_workflows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      queen_events: {
        Row: {
          actor: string | null
          created_at: string | null
          id: string
          payload: Json | null
          processed: boolean | null
          project: string | null
          source: string
          summary: string
          trace_id: string | null
          type: string
        }
        Insert: {
          actor?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          project?: string | null
          source: string
          summary: string
          trace_id?: string | null
          type: string
        }
        Update: {
          actor?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          project?: string | null
          source?: string
          summary?: string
          trace_id?: string | null
          type?: string
        }
        Relationships: []
      }
      release_runs: {
        Row: {
          card_ids: string[]
          completed_at: string | null
          created_at: string | null
          github_run_id: number | null
          id: string
          results: Json | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          summary: string | null
          triggered_by: string
        }
        Insert: {
          card_ids: string[]
          completed_at?: string | null
          created_at?: string | null
          github_run_id?: number | null
          id?: string
          results?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          summary?: string | null
          triggered_by?: string
        }
        Update: {
          card_ids?: string[]
          completed_at?: string | null
          created_at?: string | null
          github_run_id?: number | null
          id?: string
          results?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          summary?: string | null
          triggered_by?: string
        }
        Relationships: []
      }
      research_reports: {
        Row: {
          chart_data: Json | null
          created_at: string
          data_sources_used: string[] | null
          email_sent_at: string | null
          email_status: string | null
          error_message: string | null
          executive_summary: string | null
          generation_time_ms: number | null
          id: string
          key_findings: Json | null
          period_end: string | null
          period_start: string | null
          raw_data: Json | null
          report_date: string
          sections: Json
          sentiment_data: Json | null
          slug: string
          source_count: number | null
          status: string
          subscription_id: string
          title: string
          updated_at: string
        }
        Insert: {
          chart_data?: Json | null
          created_at?: string
          data_sources_used?: string[] | null
          email_sent_at?: string | null
          email_status?: string | null
          error_message?: string | null
          executive_summary?: string | null
          generation_time_ms?: number | null
          id?: string
          key_findings?: Json | null
          period_end?: string | null
          period_start?: string | null
          raw_data?: Json | null
          report_date: string
          sections?: Json
          sentiment_data?: Json | null
          slug: string
          source_count?: number | null
          status?: string
          subscription_id: string
          title: string
          updated_at?: string
        }
        Update: {
          chart_data?: Json | null
          created_at?: string
          data_sources_used?: string[] | null
          email_sent_at?: string | null
          email_status?: string | null
          error_message?: string | null
          executive_summary?: string | null
          generation_time_ms?: number | null
          id?: string
          key_findings?: Json | null
          period_end?: string | null
          period_start?: string | null
          raw_data?: Json | null
          report_date?: string
          sections?: Json
          sentiment_data?: Json | null
          slug?: string
          source_count?: number | null
          status?: string
          subscription_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_reports_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "research_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      research_subscriptions: {
        Row: {
          branding: Json
          created_at: string
          data_sources: string[]
          description: string | null
          excluded_keywords: string[] | null
          frequency: string
          id: string
          keywords: string[]
          last_run_at: string | null
          name: string
          next_run_at: string | null
          recipients: Json
          schedule_day: number | null
          schedule_hour: number | null
          search_depth: number
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          data_sources?: string[]
          description?: string | null
          excluded_keywords?: string[] | null
          frequency?: string
          id?: string
          keywords?: string[]
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          recipients?: Json
          schedule_day?: number | null
          schedule_hour?: number | null
          search_depth?: number
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          data_sources?: string[]
          description?: string | null
          excluded_keywords?: string[] | null
          frequency?: string
          id?: string
          keywords?: string[]
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          recipients?: Json
          schedule_day?: number | null
          schedule_hour?: number | null
          search_depth?: number
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      routing_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          name: string
          status: string
          updated_at: string
          workflow: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          name: string
          status?: string
          updated_at?: string
          workflow?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          workflow?: string | null
        }
        Relationships: []
      }
      supervisor_lenses: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          external_id: string
          id: string
          internal_id: string
          internal_type: string
          last_synced_at: string | null
          metadata: Json | null
          source: string
          status: string | null
          sync_direction: string | null
        }
        Insert: {
          external_id: string
          id?: string
          internal_id: string
          internal_type: string
          last_synced_at?: string | null
          metadata?: Json | null
          source: string
          status?: string | null
          sync_direction?: string | null
        }
        Update: {
          external_id?: string
          id?: string
          internal_id?: string
          internal_type?: string
          last_synced_at?: string | null
          metadata?: Json | null
          source?: string
          status?: string | null
          sync_direction?: string | null
        }
        Relationships: []
      }
      task_type_routing: {
        Row: {
          auto_switch: boolean | null
          default_model: string | null
          description: string | null
          is_governance: boolean | null
          override_expires_at: string | null
          override_model: string | null
          override_reason: string | null
          stakes_level: string | null
          task_type: string
        }
        Insert: {
          auto_switch?: boolean | null
          default_model?: string | null
          description?: string | null
          is_governance?: boolean | null
          override_expires_at?: string | null
          override_model?: string | null
          override_reason?: string | null
          stakes_level?: string | null
          task_type: string
        }
        Update: {
          auto_switch?: boolean | null
          default_model?: string | null
          description?: string | null
          is_governance?: boolean | null
          override_expires_at?: string | null
          override_model?: string | null
          override_reason?: string | null
          stakes_level?: string | null
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_type_routing_default_model_fkey"
            columns: ["default_model"]
            isOneToOne: false
            referencedRelation: "model_library"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "task_type_routing_override_model_fkey"
            columns: ["override_model"]
            isOneToOne: false
            referencedRelation: "model_library"
            referencedColumns: ["slug"]
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
      user_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          endpoint_path: string
          id: string
          secret: string | null
          source: string
          transform_config: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          endpoint_path: string
          id?: string
          secret?: string | null
          source: string
          transform_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          endpoint_path?: string
          id?: string
          secret?: string | null
          source?: string
          transform_config?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workflows: {
        Row: {
          chain_next: string | null
          created: string | null
          created_at: string | null
          file_path: string | null
          id: string
          layer: string | null
          markdown_path: string
          name: string | null
          prerequisites: string[] | null
          project_id: string | null
          purpose: string | null
          sections: Json | null
          skill: string | null
          slug: string
          status: string | null
          title: string
          trigger: string | null
          updated_at: string | null
          workflow_type: string
        }
        Insert: {
          chain_next?: string | null
          created?: string | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          layer?: string | null
          markdown_path: string
          name?: string | null
          prerequisites?: string[] | null
          project_id?: string | null
          purpose?: string | null
          sections?: Json | null
          skill?: string | null
          slug: string
          status?: string | null
          title: string
          trigger?: string | null
          updated_at?: string | null
          workflow_type: string
        }
        Update: {
          chain_next?: string | null
          created?: string | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          layer?: string | null
          markdown_path?: string
          name?: string | null
          prerequisites?: string[] | null
          project_id?: string | null
          purpose?: string | null
          sections?: Json | null
          skill?: string | null
          slug?: string
          status?: string | null
          title?: string
          trigger?: string | null
          updated_at?: string | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_chain_next_fkey"
            columns: ["chain_next"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
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
      daemon_health_check: { Args: never; Returns: Json }
      discord_bender_post: {
        Args: {
          p_bender_slug: string
          p_card_id: string
          p_message: string
          p_message_type?: string
          p_project_id: string
        }
        Returns: string
      }
      discord_notify_project: {
        Args: {
          p_actor?: string
          p_card_id?: string
          p_embed: Json
          p_message_type?: string
          p_project_id: string
        }
        Returns: string
      }
      discord_post_message: {
        Args: {
          p_actor?: string
          p_card_id?: string
          p_channel?: string
          p_embed: Json
          p_message_type?: string
          p_project_id?: string
          p_webhook_url: string
        }
        Returns: string
      }
      log_audit: {
        Args: {
          p_action: string
          p_actor?: string
          p_card_id?: string
          p_category: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
          p_new_value?: string
          p_old_value?: string
          p_project_id?: string
          p_source?: string
        }
        Returns: string
      }
      nexus_board_health_check: { Args: never; Returns: Json }
      nexus_cleanup_expired_locks: { Args: never; Returns: number }
      nexus_cleanup_expired_locks_rpc: { Args: never; Returns: Json }
      nexus_route_card: {
        Args: { p_tags?: string[]; p_title: string }
        Returns: string
      }
      update_card_with_actor: {
        Args: { p_actor: string; p_card_id: string; p_updates: Json }
        Returns: Json
      }
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
