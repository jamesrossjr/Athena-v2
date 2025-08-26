export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
          user_id?: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
      }
      documents: {
        Row: {
          id: string
          workspace_id: string
          title: string
          blocks: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          blocks?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          blocks?: Json
          updated_at?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
