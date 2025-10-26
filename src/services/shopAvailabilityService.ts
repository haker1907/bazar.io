import { supabase } from '@/lib/supabase'

export interface ShopAvailabilityResult {
  available: boolean
  shop_id?: string
  block_shop_code?: string
  selected_by?: string
  selected_at?: string
  message?: string
  error?: string
}

export interface SelectShopResult {
  success: boolean
  shop_id?: string
  block_shop_code?: string
  error?: string
  selected_by?: string
}

export class ShopAvailabilityService {
  // Check if a specific shop is available
  static async checkShopAvailability(
    marketId: string, 
    blockShopCode: string
  ): Promise<ShopAvailabilityResult> {
    try {
      const { data, error } = await supabase.rpc('check_shop_availability', {
        p_market_id: marketId,
        p_block_shop_code: blockShopCode
      })

      if (error) {
        console.error('Error checking shop availability:', error)
        return {
          available: false,
          error: error.message
        }
      }

      return data
    } catch (error) {
      console.error('Exception checking shop availability:', error)
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Select a shop (mark as unavailable)
  static async selectShop(
    userId: string,
    marketId: string,
    blockShopCode: string
  ): Promise<SelectShopResult> {
    try {
      const { data, error } = await supabase.rpc('select_shop', {
        p_user_id: userId,
        p_market_id: marketId,
        p_block_shop_code: blockShopCode
      })

      if (error) {
        console.error('Error selecting shop:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return data
    } catch (error) {
      console.error('Exception selecting shop:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Release a shop (mark as available)
  static async releaseShop(
    userId: string,
    shopId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('release_shop', {
        p_user_id: userId,
        p_shop_id: shopId
      })

      if (error) {
        console.error('Error releasing shop:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return data
    } catch (error) {
      console.error('Exception releasing shop:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get all available shops for a market
  static async getAvailableShops(marketId: string) {
    try {
      const { data, error } = await supabase
        .from('block_shop_combinations')
        .select(`
          id,
          block_shop_code,
          block_letter,
          shop_number,
          is_available,
          selected_by_user_id,
          selected_at
        `)
        .eq('market_id', marketId)
        .eq('is_active', true)
        .order('block_letter', { ascending: true })
        .order('shop_number', { ascending: true })

      if (error) {
        console.error('Error fetching available shops:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Exception fetching available shops:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error')
      }
    }
  }

  // Get shops selected by a specific user
  static async getUserSelectedShops(userId: string) {
    try {
      const { data, error } = await supabase
        .from('block_shop_combinations')
        .select(`
          id,
          block_shop_code,
          block_letter,
          shop_number,
          market_id,
          markets!inner(name)
        `)
        .eq('selected_by_user_id', userId)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching user selected shops:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Exception fetching user selected shops:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error')
      }
    }
  }
}


