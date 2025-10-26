import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Optimized Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable PKCE flow for better security and performance
    flowType: 'pkce',
    // Auto refresh tokens
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session in URL
    detectSessionInUrl: true,
    // Storage key for session
    storageKey: 'supabase.auth.token',
    // Storage for session
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  // Global configuration
  global: {
    headers: {
      'X-Client-Info': 'admin-panel@1.0.0',
    },
  },
  // Real-time configuration
  realtime: {
    // Enable real-time features
    params: {
      eventsPerSecond: 10,
    },
  },
  // Database configuration
  db: {
    schema: 'public',
  },
})

// Database types
export interface Market {
  id: string
  name: string
  created_at: string
}

export interface Block {
  id: string
  name: string
  market_id: string
  created_at: string
}

export interface Shop {
  id: string
  name: string
  block_id: string
  created_at: string
  blocks?: {
    name: string
    markets?: {
      name: string
    }
  }
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url?: string | null // Legacy single image URL
  images?: string[] // Array of image URLs (max 5)
  block_shop_combination_id: string
  created_at: string
  updated_at?: string
}

export interface UserProfile {
  id: string
  user_id: string
  selected_shop_id: string | null
  selected_market_id: string | null
  selected_block_shop_combination_id: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email?: string
  created_at?: string
  updated_at?: string
}