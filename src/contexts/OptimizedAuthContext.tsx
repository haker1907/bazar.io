'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase'
import { createUserProfile } from '@/utils/profileUtils'

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, telephone: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateUserProfile: (shopId: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cache for user profiles to avoid repeated fetches
const profileCache = new Map<string, { profile: UserProfile | null; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function OptimizedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Memoized fetchUserProfile with caching
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      // Check cache first
      const cached = profileCache.get(userId)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setUserProfile(cached.profile)
        return
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('User does not have a profile yet. This is normal for new users.')
          setUserProfile(null)
          profileCache.set(userId, { profile: null, timestamp: Date.now() })
          return
        }
        
        if (error.message?.includes('relation "user_profiles" does not exist')) {
          console.log('user_profiles table does not exist. User will create profile during shop selection.')
          setUserProfile(null)
          profileCache.set(userId, { profile: null, timestamp: Date.now() })
          return
        }
        
        if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          console.log('user_profiles table access denied (RLS issue). User will create profile during shop selection.')
          setUserProfile(null)
          profileCache.set(userId, { profile: null, timestamp: Date.now() })
          return
        }
        
        console.log('Could not fetch user profile (this is OK for new users):', error.message)
        setUserProfile(null)
        profileCache.set(userId, { profile: null, timestamp: Date.now() })
        return
      }

      setUserProfile(data)
      profileCache.set(userId, { profile: data, timestamp: Date.now() })
    } catch (error) {
      console.log('Exception fetching user profile (this is OK for new users):', error)
      setUserProfile(null)
      profileCache.set(userId, { profile: null, timestamp: Date.now() })
    }
  }, [])

  // Optimized sign in with better error handling
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      // Clear cache for this user to ensure fresh data
      if (data.user) {
        profileCache.delete(data.user.id)
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  // Optimized sign up
  const signUp = useCallback(async (email: string, password: string, fullName: string, telephone: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      if (data?.user) {
        // Create user profile in background (non-blocking)
        createUserProfile(data.user.id, fullName, telephone)
          .then((profileResult) => {
            if (profileResult.error) {
              console.log('Profile will be created during shop selection')
            } else {
              console.log('Profile created successfully during registration')
            }
          })
          .catch(() => {
            console.log('Profile will be created during shop selection')
          })
      }
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  // Optimized sign out
  const signOut = useCallback(async () => {
    try {
      // Clear cache
      profileCache.clear()
      
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setUserProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [])

  // Optimized update user profile
  const updateUserProfile = useCallback(async (shopId: string) => {
    if (!user) {
      return { error: new Error('No user logged in') }
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          selected_shop_id: shopId,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        return { error: new Error(error.message) }
      }

      setUserProfile(data)
      // Update cache
      profileCache.set(user.id, { profile: data, timestamp: Date.now() })
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [user])

  // Optimized auth state management
  useEffect(() => {
    let mounted = true
    let authSubscription: unknown = null

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Auth initialization error:', error)
          setLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        }
        
        setLoading(false)
        setInitialized(true)
      } catch (error) {
        console.error('Auth initialization failed:', error)
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    // Initialize auth
    initializeAuth()

    // Set up auth state listener with debouncing
    authSubscription = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      
      // Debounce rapid auth changes
      const timeoutId = setTimeout(async () => {
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUserProfile(null)
          // Clear cache on sign out
          profileCache.clear()
        }
      }, 100)
      
      // Store timeout ID for cleanup
      if (authSubscription && typeof authSubscription === 'object' && 'unsubscribe' in authSubscription) {
        (authSubscription as { timeoutId?: NodeJS.Timeout }).timeoutId = timeoutId
      }
    })

    return () => {
      mounted = false
      if (authSubscription && typeof authSubscription === 'object' && 'data' in authSubscription) {
        const subscription = (authSubscription as { data: { subscription: { unsubscribe: () => void } } }).data.subscription
        subscription.unsubscribe()
      }
    }
  }, [fetchUserProfile])

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    session,
    userProfile,
    loading: loading || !initialized,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  }), [user, session, userProfile, loading, initialized, signIn, signUp, signOut, updateUserProfile])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an OptimizedAuthProvider')
  }
  return context
}

