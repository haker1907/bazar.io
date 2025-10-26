import { supabase } from '@/lib/supabase'

export const clearAuthTokens = async () => {
  try {
    await supabase.auth.signOut()
    // Clear any additional localStorage items if needed
    localStorage.removeItem('supabase.auth.token')
    localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
  } catch (error) {
    console.error('Error clearing auth tokens:', error)
  }
}

export const handleAuthError = (error: unknown) => {
  console.error('Auth error:', error)
  
  // If it's a refresh token error, clear tokens and redirect to login
  if ((error as Error)?.message?.includes('Invalid Refresh Token') || 
      (error as Error)?.message?.includes('Refresh Token Not Found')) {
    clearAuthTokens()
    window.location.href = '/login'
  }
}


