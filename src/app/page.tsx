'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { handleAuthError } from '@/utils/authUtils'

export default function Home() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      try {
        if (user) {
          // Check if user has completed their one-time shop setup
          if (userProfile?.selected_shop_id) {
            router.push('/dashboard')
          } else {
            // First time login or no profile - need to complete shop setup
            router.push('/select-market')
          }
        } else {
          router.push('/login')
        }
      } catch (error) {
        handleAuthError(error)
      }
    }
  }, [user, userProfile, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
