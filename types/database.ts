export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      supermarkets: {
        Row: {
          id: string
          slug: string
          name: string
          base_url: string
          logo_url: string | null
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['supermarkets']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['supermarkets']['Insert']>
      }
      products: {
        Row: {
          id: string
          supermarket_id: string
          external_id: string
          name: string
          brand: string | null
          unit: string | null
          category: string
          image_url: string | null
          product_url: string
          embedding: number[] | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      price_history: {
        Row: {
          id: string
          product_id: string
          price: number
          original_price: number | null
          available: boolean
          scraped_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['price_history']['Row'], 'id' | 'created_at'>
        Update: never
      }
      product_matches: {
        Row: {
          id: string
          canonical_product_id: string
          matched_product_id: string
          similarity_score: number
          match_method: 'embedding' | 'barcode' | 'manual'
          confirmed: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['product_matches']['Row'], 'id' | 'created_at'>
        Update: Pick<Database['public']['Tables']['product_matches']['Row'], 'confirmed'>
      }
      scrape_jobs: {
        Row: {
          id: string
          supermarket_id: string
          status: 'pending' | 'running' | 'completed' | 'failed'
          started_at: string | null
          completed_at: string | null
          products_scraped: number
          errors: Json
          triggered_by: 'cron' | 'manual'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['scrape_jobs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['scrape_jobs']['Insert']>
      }
      users: {
        Row: {
          id: string
          role: 'admin' | 'user'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>
        Update: Pick<Database['public']['Tables']['users']['Row'], 'role'>
      }
    }
    Functions: {
      match_products: {
        Args: {
          query_embedding: string
          source_supermarket_id: string
          match_threshold: number
          match_count: number
        }
        Returns: Array<{ id: string; similarity: number }>
      }
    }
    Views: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
