import { supabase } from '@/lib/supabase'
import { formatUzbekPhoneNumber } from './phoneUtils'

export interface CreateUserProfileData {
  userId: string
  fullName: string
  telephone: string
}

export const createUserProfile = async (
  userId: string, 
  fullName: string, 
  telephone: string
): Promise<{ data: unknown; error: Error | null }> => {
  try {
    console.log('Creating user profile with data:', { userId, fullName, telephone })
    
    // Format the phone number
    const formattedTelephone = formatUzbekPhoneNumber(telephone)
    console.log('Formatted telephone:', formattedTelephone)
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        full_name: fullName,
        telephone: formattedTelephone,
      })
      .select()
      .single()

    if (error) {
      // Silently handle profile creation errors - this is expected for new users
      return { data: null, error: new Error(`Profile creation failed: ${error.message || 'Unknown error'}`) }
    }

    console.log('User profile created successfully:', data)
    return { data, error: null }
  } catch (error) {
    // Silently handle profile creation exceptions - this is expected for new users
    return { data: null, error: error as Error }
  }
}

export const updateUserProfile = async (
  userId: string,
  updates: Partial<CreateUserProfileData>
): Promise<{ data: unknown; error: Error | null }> => {
  try {
    const updateData: Record<string, unknown> = { ...updates }
    
    // Format phone number if provided
    if (updates.telephone) {
      updateData.telephone = formatUzbekPhoneNumber(updates.telephone)
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Exception updating user profile:', error)
    return { data: null, error: error as Error }
  }
}

export const getUserProfile = async (userId: string): Promise<{ data: unknown; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Exception fetching user profile:', error)
    return { data: null, error: error as Error }
  }
}
