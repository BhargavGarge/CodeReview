export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ─────────────────────────────────────────────────────────────────
export type ExperienceLevel = "junior" | "mid" | "senior" | "lead";
export type SessionLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "cpp"
  | "csharp"
  | "ruby"
  | "php"
  | "other";
export type ParticipantRole = "owner" | "reviewer" | "viewer";
export type ReviewStatus = "pending" | "processing" | "completed" | "failed";
export type CommentSeverity = "info" | "warning" | "error" | "suggestion";
export type CommentCategory =
  | "security"
  | "performance"
  | "style"
  | "logic"
  | "best_practice";
export type SubscriptionPlan = "free" | "pro" | "team";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";
export type UsageAction = "ai_review" | "session_created" | "snapshot_saved";
export type SessionEventType = "code-update" | "cursor-move" | "ai-review-requested";

// ─── Database shape ─────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      // ── Phase 1: Profiles ───────────────────────────────────────────────
      profiles: {
        Row: {
          id: string;
          name: string | null;
          role: string | null;
          experience_level: ExperienceLevel | null;
          avatar_url: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          role?: string | null;
          experience_level?: ExperienceLevel | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string | null;
          role?: string | null;
          experience_level?: ExperienceLevel | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Phase 2: Sessions ───────────────────────────────────────────────
      sessions: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          language: SessionLanguage;
          code: string;
          github_repo_url: string | null;
          is_active: boolean;
          invite_token: string;
          max_participants: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title?: string;
          description?: string | null;
          language?: SessionLanguage;
          code?: string;
          github_repo_url?: string | null;
          is_active?: boolean;
          invite_token?: string;
          max_participants?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          language?: SessionLanguage;
          code?: string;
          github_repo_url?: string | null;
          is_active?: boolean;
          max_participants?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Phase 2/3: Session participants ────────────────────────────────
      session_participants: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          role: ParticipantRole;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          role?: ParticipantRole;
          joined_at?: string;
        };
        Update: {
          role?: ParticipantRole;
        };
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_participants_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Phase 3: Session snapshots ─────────────────────────────────────
      session_snapshots: {
        Row: {
          id: string;
          session_id: string;
          code: string;
          saved_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          code: string;
          saved_by?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "session_snapshots_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_snapshots_saved_by_fkey";
            columns: ["saved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Phase 3: Session files (multi-file support) ──────────────────────
      session_files: {
        Row: {
          id: string;
          session_id: string;
          file_name: string;
          content: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          file_name: string;
          content?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          file_name?: string;
          content?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_files_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_files_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Phase 4: AI reviews ────────────────────────────────────────────
      ai_reviews: {
        Row: {
          id: string;
          session_id: string;
          requested_by: string | null;
          code_snapshot: string;
          status: ReviewStatus;
          model_used: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          requested_by?: string | null;
          code_snapshot: string;
          status?: ReviewStatus;
          model_used?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: ReviewStatus;
          model_used?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          error_message?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_reviews_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_reviews_requested_by_fkey";
            columns: ["requested_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Phase 4: Review comments ───────────────────────────────────────
      review_comments: {
        Row: {
          id: string;
          review_id: string;
          line_start: number;
          line_end: number;
          severity: CommentSeverity;
          category: CommentCategory;
          message: string;
          suggestion: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          line_start: number;
          line_end: number;
          severity?: CommentSeverity;
          category?: CommentCategory;
          message: string;
          suggestion?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "review_comments_review_id_fkey";
            columns: ["review_id"];
            referencedRelation: "ai_reviews";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Phase 5: Subscriptions ─────────────────────────────────────────
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: SubscriptionPlan;
          status: SubscriptionStatus;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Phase 5: Usage logs ────────────────────────────────────────────
      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          action: UsageAction;
          session_id: string | null;
          review_id: string | null;
          billing_period: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: UsageAction;
          session_id?: string | null;
          review_id?: string | null;
          billing_period: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "usage_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usage_logs_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usage_logs_review_id_fkey";
            columns: ["review_id"];
            referencedRelation: "ai_reviews";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Event sourcing: append-only editor action log ──────────────────
      session_events: {
        Row: {
          id: string;
          session_id: string;
          user_id: string | null;
          event_type: SessionEventType;
          created_at: string;
          payload: Json;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id?: string | null;
          event_type: SessionEventType;
          created_at?: string;
          payload?: Json;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "session_events_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Phase 5: Plan limits (reference / seed data) ───────────────────
      plan_limits: {
        Row: {
          plan: SubscriptionPlan;
          max_sessions: number;
          max_participants: number;
          ai_reviews_per_month: number;
          snapshot_retention_days: number;
        };
        Insert: {
          plan: SubscriptionPlan;
          max_sessions: number;
          max_participants: number;
          ai_reviews_per_month: number;
          snapshot_retention_days: number;
        };
        Update: {
          max_sessions?: number;
          max_participants?: number;
          ai_reviews_per_month?: number;
          snapshot_retention_days?: number;
        };
        Relationships: [];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      ai_reviews_used_this_period: {
        Args: { p_user_id: string };
        Returns: number;
      };
      // Accepts an invite and adds the caller to session_participants.
      // Security-definer — works regardless of sessions RLS.
      accept_session_invite: {
        Args: { p_invite_token: string };
        Returns: Array<{ session_id: string; session_title: string }>;
      };
      // Resolves invite token → session id + title (no sensitive fields).
      // Lighter alternative to accept_session_invite; pair with a client-side
      // session_participants upsert when the full RPC isn't deployed.
      get_session_by_invite_token: {
        Args: { p_invite_token: string };
        Returns: Array<{ session_id: string; session_title: string }>;
      };
    };

    Enums: {
      experience_level: ExperienceLevel;
      session_language: SessionLanguage;
      participant_role: ParticipantRole;
      review_status: ReviewStatus;
      comment_severity: CommentSeverity;
      comment_category: CommentCategory;
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
      usage_action: UsageAction;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
