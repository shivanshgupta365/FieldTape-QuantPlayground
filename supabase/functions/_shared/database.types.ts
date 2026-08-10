export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      daily_challenges: {
        Row: {
          id: string;
          challenge_date: string;
          slug: string;
          title: string;
          description: string;
          engine_version: string;
          action_schema_version: number;
          seed: number;
          max_actions: number;
          parameters: Json;
          scoring: Json;
          opens_at: string;
          closes_at: string;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          challenge_date: string;
          slug: string;
          title: string;
          description: string;
          engine_version: string;
          action_schema_version: number;
          seed: number;
          max_actions: number;
          parameters: Json;
          scoring: Json;
          opens_at: string;
          closes_at: string;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["daily_challenges"]["Insert"]
        >;
        Relationships: [];
      };
      challenge_submissions: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          public_player_id: string;
          player_display_name: string;
          idempotency_key: string;
          action_log_hash: string;
          action_count: number;
          score: number;
          tie_break: number;
          verifier_version: string;
          result: Json;
          verified_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          public_player_id: string;
          player_display_name: string;
          idempotency_key: string;
          action_log_hash: string;
          action_count: number;
          score: number | string;
          tie_break: number | string;
          verifier_version: string;
          result: Json;
          verified_at?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["challenge_submissions"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "daily_challenges";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          user_id: string;
          public_id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          public_id?: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_challenge_submission_quota: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_window_seconds?: number;
        };
        Returns: Array<{
          allowed: boolean;
          remaining: number;
          retry_after_seconds: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
