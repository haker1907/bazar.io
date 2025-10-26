'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase'
import { createUserProfile } from '@/utils/profileUtils'

// Module-level cache to persist across renders and prevent re-creation
const globalCache = new Map<string, { profile: UserProfile | null; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const pendingRequests = new Map<string, Promise<UserProfile | null>>()

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, telephone: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateUserProfile: (combinationId: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)


  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      // Check cache first
      const cached = globalCache.get(userId)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setUserProfile(cached.profile)
        return
      }

      // Check if there's already a pending request for this user
      if (pendingRequests.has(userId)) {
        const result = await pendingRequests.get(userId)!
        setUserProfile(result)
        return
      }

      // Create a new request
      const requestPromise = (async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows returned - user doesn't have a profile yet
            console.log('User does not have a profile yet. This is normal for new users.')
            globalCache.set(userId, { profile: null, timestamp: Date.now() })
            return null
          }
          
          // Check if it's a table doesn't exist error
          if (error.message?.includes('relation "user_profiles" does not exist')) {
            console.log('user_profiles table does not exist. User will create profile during shop selection.')
            globalCache.set(userId, { profile: null, timestamp: Date.now() })
            return null
          }
          
          // Check for 406 Not Acceptable error (RLS or permissions issue)
          if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
            console.log('user_profiles table access denied (RLS issue). User will create profile during shop selection.')
            globalCache.set(userId, { profile: null, timestamp: Date.now() })
            return null
          }
          
          // Any other error - just log and continue
          console.log('Could not fetch user profile (this is OK for new users):', error.message)
          globalCache.set(userId, { profile: null, timestamp: Date.now() })
          return null
        }

        globalCache.set(userId, { profile: data, timestamp: Date.now() })
        return data
      })()

      // Store the pending request
      pendingRequests.set(userId, requestPromise)

      try {
        const result = await requestPromise
        setUserProfile(result)
      } finally {
        // Clean up the pending request
        pendingRequests.delete(userId)
      }
    } catch (error) {
      console.log('Exception fetching user profile (this is OK for new users):', error)
      setUserProfile(null)
      globalCache.set(userId, { profile: null, timestamp: Date.now() })
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // Get initial session with retry logic
    const getSessionWithRetry = async (retryCount = 0) => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          console.error('Error getting initial session (attempt', retryCount + 1, '):', error)
          
          // Check if it's a refresh token error
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
            console.log('Invalid refresh token detected, clearing session...')
            // Clear invalid session
            await supabase.auth.signOut()
            // Clear all Supabase-related items from localStorage
            try {
              const keysToRemove: string[] = []
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith('sb-')) {
                  keysToRemove.push(key)
                }
              }
              keysToRemove.forEach(key => localStorage.removeItem(key))
              console.log('Cleared invalid session data')
            } catch (e) {
              console.warn('Could not clear localStorage:', e)
            }
            if (isMounted) {
              setUser(null)
              setSession(null)
              setUserProfile(null)
              setLoading(false)
            }
            return
          }
          
          // Retry up to 3 times with exponential backoff for other errors
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
            console.log(`Retrying session fetch in ${delay}ms...`)
            setTimeout(() => getSessionWithRetry(retryCount + 1), delay)
            return
          }
          
          // After 3 retries, try to preserve existing session from localStorage
          console.log('Max retries reached, trying to preserve existing session...')
          try {
            const existingSession = localStorage.getItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
            if (existingSession) {
              console.log('Found existing session in localStorage, preserving login state')
              // Don't clear the session - keep user logged in
              if (isMounted) {
                setLoading(false)
              }
              return
            }
               } catch {
                 console.warn('localStorage not available, but preserving login state anyway')
               }
          
          // Even if no localStorage, try to preserve login state
          console.log('No localStorage session found, but preserving login state to prevent sign out')
          if (isMounted) {
            setLoading(false)
          }
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Add timeout to prevent hanging
          try {
            await Promise.race([
              fetchUserProfile(session.user.id),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
              )
            ])
          } catch (error) {
            console.warn('Profile fetch failed or timed out:', error)
            // Continue without profile - user can still use the app
          }
        }
        
        if (isMounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('Unexpected error in session fetch:', error)
        // Don't clear session on unexpected errors - preserve login state
        console.log('Preserving login state despite error')
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getSessionWithRetry()

    // Listen for auth changes with debouncing
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      console.log('Auth state change:', event, session?.user?.id ? 'User exists' : 'No user')
      
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('Token refresh failed, clearing session...')
        // Clear invalid session data
        try {
          const keysToRemove: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('sb-')) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key))
          console.log('Cleared invalid session data after failed refresh')
        } catch (e) {
          console.warn('Could not clear localStorage:', e)
        }
        setSession(null)
        setUser(null)
        setUserProfile(null)
        globalCache.clear()
        pendingRequests.clear()
        setLoading(false)
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      
      // Only fetch profile if user changed or signed in
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          await fetchUserProfile(session.user.id)
        } catch (error) {
          console.warn('Profile fetch failed during auth state change:', error)
          // Continue without profile - don't clear user session
        }
      } else if (!session?.user && event === 'SIGNED_OUT') {
        // Only clear profile when explicitly signed out
        setUserProfile(null)
        globalCache.clear()
        pendingRequests.clear()
      }
      
      if (isMounted) {
        setLoading(false)
      }
    })

    // Timeout fallback - if loading takes too long, stop loading
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth loading timeout - stopping loading state')
        setLoading(false)
      }
    }, 3000) // Increased to 3 seconds but still reasonable

    return () => {
      isMounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [loading, fetchUserProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName: string, telephone: string) => {
    try {
      console.log('Starting signup process with:', { email, fullName, telephone })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            telephone: telephone,
          }
        }
      })
      
      if (error) {
        console.error('Supabase auth signup error:', error)
        return { error }
      }
      
      console.log('Auth signup successful, user created:', data?.user?.id)
      
      // If user was created successfully, try to create profile manually as fallback
      // This is completely optional and won't block registration
      if (data?.user) {
        // Run profile creation in background without blocking or logging errors
        createUserProfile(data.user.id, fullName, telephone)
          .then((profileResult) => {
            if (profileResult.error) {
              // Silently ignore profile creation errors
              console.log('Profile will be created during shop selection')
            } else {
              console.log('Profile created successfully during registration')
            }
          })
          .catch(() => {
            // Silently ignore profile creation exceptions
            console.log('Profile will be created during shop selection')
          })
      }
      
      return { error: null }
    } catch (error) {
      console.error('Unexpected error in signUp:', error)
      return { error: error as Error }
    }
  }

  const updateUserProfile = async (combinationId: string) => {
    if (!user) return { error: new Error('No user logged in') }

    // Check if user already has a market or shop selected
    if (userProfile?.selected_market_id || userProfile?.selected_shop_id) {
      console.log('User already has market/shop selected, preventing change')
      return { error: new Error('Shop selection already completed') }
    }

    try {
      console.log('Updating user profile with combination ID:', combinationId)
      
      // Get the block_shop_combination details
      const { data: combinationData, error: combinationError } = await supabase
        .from('block_shop_combinations')
        .select('id, market_id, block_shop_code, block_letter, shop_number')
        .eq('id', combinationId)
        .single()

      if (combinationError) {
        console.error('Error finding block shop combination:', combinationError)
        return { error: new Error('Could not find shop combination') }
      }

      console.log('Found combination data:', combinationData)

      console.log('🔍 Starting availability check for combinationId:', combinationId)
      console.log('🔍 Current user ID:', user.id)

      // Add a longer delay to ensure database consistency and transaction completion
      console.log('⏳ Waiting for database consistency...')
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if shop is already selected by another user (with retry)
      let existingSelection = null
      let checkError = null
      
      for (let attempt = 0; attempt < 3; attempt++) {
        console.log(`🔍 Attempt ${attempt + 1}: Checking shop availability...`)
        
        const { data, error } = await supabase
          .from('block_shop_combinations')
          .select('id, selected_by_user_id, is_available, is_active')
          .eq('id', combinationId)
          .single()

        console.log(`🔍 Attempt ${attempt + 1} result:`, { data, error })

        if (!error) {
          existingSelection = data
          checkError = null
          console.log(`✅ Success on attempt ${attempt + 1}`)
          break
        } else {
          checkError = error
          console.log(`❌ Attempt ${attempt + 1} failed:`, error)
          if (attempt < 2) {
            console.log(`⏳ Waiting 200ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }

      if (checkError) {
        console.error('❌ Error checking shop availability after retries:', checkError)
        console.log('🔄 Attempting to proceed without availability check (combination may be newly created)')
        // Don't return error - proceed with selection since combination was just created
      }

      console.log('📊 Existing selection data:', existingSelection)
      console.log('📊 Is available:', existingSelection?.is_available)
      console.log('📊 Is active:', existingSelection?.is_active)
      console.log('📊 Selected by user ID:', existingSelection?.selected_by_user_id)
      console.log('📊 Current user ID:', user.id)

      // Only check if someone else has selected this shop (if we have data)
      if (existingSelection && existingSelection.selected_by_user_id && existingSelection.selected_by_user_id !== user.id) {
        console.log('❌ Shop already selected by another admin')
        return { 
          error: new Error('This shop is already selected by another admin') 
        }
      }

      // If this user has already selected this shop, that's fine - allow them to continue
      if (existingSelection && existingSelection.selected_by_user_id === user.id) {
        console.log('✅ User has already selected this shop, allowing continuation')
      }

      // If we couldn't get existing selection data, proceed anyway (combination was just created)
      if (!existingSelection) {
        console.log('⚠️ Could not retrieve existing selection data, proceeding anyway (combination was just created)')
      }

      console.log('✅ Proceeding with shop selection...')

      // Mark the shop as selected (with retry mechanism)
      console.log('🔄 Starting shop selection process...')
      let selectError = null
      let selectSuccess = false
      
      for (let attempt = 0; attempt < 3; attempt++) {
        console.log(`🔄 Select attempt ${attempt + 1}: Updating shop selection...`)
        
        const { error } = await supabase
          .from('block_shop_combinations')
          .update({
            is_available: true, // Make sure it's available
            is_active: true,    // Make sure it's active
            selected_by_user_id: user.id,
            selected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', combinationId)

        console.log(`🔄 Select attempt ${attempt + 1} result:`, { error })

        if (!error) {
          selectSuccess = true
          selectError = null
          console.log(`✅ Shop selection successful on attempt ${attempt + 1}`)
          break
        } else {
          selectError = error
          console.log(`❌ Select attempt ${attempt + 1} failed:`, error)
          if (attempt < 2) {
            console.log(`⏳ Waiting 200ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }

      if (!selectSuccess) {
        console.error('❌ Error selecting shop after retries:', selectError)
        return { error: new Error('Failed to select shop. It may have been selected by another admin.') }
      }

      console.log('✅ Shop successfully selected and marked as available')

      // Create a simple shop ID for display purposes
      const shopId = `${combinationData.block_letter}${combinationData.shop_number}`

      // Update existing profile or create new one
      let result
      if (userProfile) {
        // Update existing profile
        const { data: updateData, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            selected_shop_id: shopId,
            selected_market_id: combinationData.market_id,
            selected_block_shop_combination_id: combinationData.id,
          })
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating user profile:', updateError)
          // Release the shop if profile update fails
          await supabase
            .from('block_shop_combinations')
            .update({
              is_available: true,
              selected_by_user_id: null,
              selected_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', combinationId)
          return { error: updateError }
        }
        
        result = updateData
      } else {
        // Create new profile with all required fields
        const { data: newData, error: newError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || 'Admin User',
            telephone: user.user_metadata?.telephone || '',
            selected_shop_id: shopId,
            selected_market_id: combinationData.market_id,
            selected_block_shop_combination_id: combinationData.id,
          })
          .select()
          .single()

        if (newError) {
          console.error('Error creating user profile:', newError)
          // Release the shop if profile creation fails
          await supabase
            .from('block_shop_combinations')
            .update({
              is_available: true,
              selected_by_user_id: null,
              selected_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', combinationId)
          if (newError.message?.includes('relation "user_profiles" does not exist')) {
            return { error: new Error('user_profiles table does not exist. Please run the database setup script.') }
          }
          if (newError.code === '23505') { // Unique constraint violation
            return { error: new Error('User profile already exists. Please refresh the page.') }
          }
          return { error: newError }
        }
        
        result = newData
      }
      
      setUserProfile(result)
      console.log('User profile updated successfully:', result)
      return { error: null }
    } catch (error) {
      console.error('Error updating user profile:', error)
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUserProfile(null)
  }

  const value = {
    user,
    session,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
