export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      works: {
        Row: {
          id: string
          user_id: string
          title: string
          genre: string
          style_preset: string
          work_type: 'novel' | 'webtoon'
          vault_mode: 'manual' | 'smart' | 'auto'
          daily_goal: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          genre?: string
          style_preset?: string
          work_type?: 'novel' | 'webtoon'
          vault_mode?: 'manual' | 'smart' | 'auto'
          daily_goal?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          genre?: string
          style_preset?: string
          work_type?: 'novel' | 'webtoon'
          vault_mode?: 'manual' | 'smart' | 'auto'
          daily_goal?: number
          created_at?: string
          updated_at?: string
        }
      }
      chapters: {
        Row: {
          id: string
          work_id: string
          number: number
          title: string
          content: string
          summary: Json | null
          word_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_id: string
          number: number
          title?: string
          content?: string
          summary?: Json | null
          word_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          number?: number
          title?: string
          content?: string
          summary?: Json | null
          word_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      vault_characters: {
        Row: {
          id: string
          work_id: string
          name: string
          aliases: Json
          appearance: string
          personality: string
          abilities: Json
          relationships: Json
          speech_pattern: string
          first_appearance: number
          is_alive: boolean
          state_log: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_id: string
          name: string
          aliases?: Json
          appearance?: string
          personality?: string
          abilities?: Json
          relationships?: Json
          speech_pattern?: string
          first_appearance?: number
          is_alive?: boolean
          state_log?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          name?: string
          aliases?: Json
          appearance?: string
          personality?: string
          abilities?: Json
          relationships?: Json
          speech_pattern?: string
          first_appearance?: number
          is_alive?: boolean
          state_log?: Json
          created_at?: string
          updated_at?: string
        }
      }
      vault_foreshadows: {
        Row: {
          id: string
          work_id: string
          summary: string
          planted_chapter: number | null
          resolved_chapter: number | null
          status: 'open' | 'resolved' | 'abandoned'
          related_characters: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_id: string
          summary: string
          planted_chapter?: number | null
          resolved_chapter?: number | null
          status?: 'open' | 'resolved' | 'abandoned'
          related_characters?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          summary?: string
          planted_chapter?: number | null
          resolved_chapter?: number | null
          status?: 'open' | 'resolved' | 'abandoned'
          related_characters?: Json
          created_at?: string
          updated_at?: string
        }
      }
      vault_world: {
        Row: {
          id: string
          work_id: string
          category: string
          name: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          work_id: string
          category?: string
          name: string
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          category?: string
          name?: string
          description?: string
          created_at?: string
        }
      }
      vault_timeline: {
        Row: {
          id: string
          work_id: string
          chapter: number
          event_summary: string
          in_world_time: string
          season: string
          created_at: string
        }
        Insert: {
          id?: string
          work_id: string
          chapter: number
          event_summary: string
          in_world_time?: string
          season?: string
          created_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          chapter?: number
          event_summary?: string
          in_world_time?: string
          season?: string
          created_at?: string
        }
      }
      style_profiles: {
        Row: {
          id: string
          work_id: string
          avg_sentence_length: number
          dialogue_ratio: number
          description_density: number
          vocab_diversity: number
          tone: string
          unique_patterns: Json
          example_paragraphs: Json
          analyzed_chapters: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_id: string
          avg_sentence_length?: number
          dialogue_ratio?: number
          description_density?: number
          vocab_diversity?: number
          tone?: string
          unique_patterns?: Json
          example_paragraphs?: Json
          analyzed_chapters?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          avg_sentence_length?: number
          dialogue_ratio?: number
          description_density?: number
          vocab_diversity?: number
          tone?: string
          unique_patterns?: Json
          example_paragraphs?: Json
          analyzed_chapters?: number
          created_at?: string
          updated_at?: string
        }
      }
      review_history: {
        Row: {
          id: string
          work_id: string
          chapter_id: string
          issues: Json | null
          tension_score: number
          created_at: string
        }
        Insert: {
          id?: string
          work_id: string
          chapter_id: string
          issues?: Json | null
          tension_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          chapter_id?: string
          issues?: Json | null
          tension_score?: number
          created_at?: string
        }
      }
      review_feedback: {
        Row: {
          id: string
          work_id: string
          issue_type: string | null
          issue_description: string | null
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          work_id: string
          issue_type?: string | null
          issue_description?: string | null
          action?: string
          created_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          issue_type?: string | null
          issue_description?: string | null
          action?: string
          created_at?: string
        }
      }
      user_plans: {
        Row: {
          id: string
          user_id: string
          plan: string
          monthly_review_limit: number
          monthly_reviews_used: number
          reset_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan?: string
          monthly_review_limit?: number
          monthly_reviews_used?: number
          reset_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan?: string
          monthly_review_limit?: number
          monthly_reviews_used?: number
          reset_at?: string
          created_at?: string
        }
      }
      daily_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          word_count: number
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          word_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          word_count?: number
        }
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
  }
}

// Convenience types
export type Work = Database['public']['Tables']['works']['Row']
export type Chapter = Database['public']['Tables']['chapters']['Row']
export type VaultCharacter = Database['public']['Tables']['vault_characters']['Row']
export type VaultForeshadow = Database['public']['Tables']['vault_foreshadows']['Row']
export type VaultWorld = Database['public']['Tables']['vault_world']['Row']
export type VaultTimeline = Database['public']['Tables']['vault_timeline']['Row']
export type StyleProfile = Database['public']['Tables']['style_profiles']['Row']
export type ReviewHistory = Database['public']['Tables']['review_history']['Row']
