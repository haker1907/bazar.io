'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Market, Block } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function SelectMarketPage() {
  const { user, updateUserProfile } = useAuth()
  const [markets, setMarkets] = useState<Market[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedMarket, setSelectedMarket] = useState<string>('')
  const [selectedBlock, setSelectedBlock] = useState<string>('')
  const [selectedShopNumber, setSelectedShopNumber] = useState<number | null>(null)
  const [shopAvailability, setShopAvailability] = useState<Map<string, boolean>>(new Map())
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Generate shop numbers 1-200
  const shopNumbers = Array.from({ length: 200 }, (_, i) => i + 1)
  
  // Define available blocks
  const availableBlocks = ['A', 'B', 'C', 'D', 'F']
  const [loading, setLoading] = useState(true)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const { userProfile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('Select Market useEffect:', { 
      hasUser: !!user, 
      userProfile, 
      hasMarketId: !!userProfile?.selected_market_id,
      hasShopId: !!userProfile?.selected_shop_id,
      hasCombinationId: !!userProfile?.selected_block_shop_combination_id
    })
    
    // Don't redirect to login if we're still loading the auth state
    if (user === null && userProfile === null) {
      // This means we're still loading, don't redirect yet
      console.log('Select Market: Still loading auth state...')
      return
    }

    // Only redirect to login if we're absolutely sure there's no user
    // AND we're not in a loading state
    if (!user && userProfile !== null) {
      console.log('Select Market: No user found after loading, redirecting to login')
      router.push('/login')
      return
    }

    // If we have a user but no profile yet, wait
    if (user && (userProfile === null || userProfile === undefined)) {
      console.log('User exists but profile still loading, setting checkingProfile to true')
      setCheckingProfile(true)
      return
    }

    // Check if user has already selected a market or shop
    if (user && userProfile && (userProfile?.selected_market_id || userProfile?.selected_shop_id)) {
      console.log('User already has a market/shop selected, redirecting to dashboard')
      router.push('/dashboard')
      return
    }

    // User profile loaded and no shop selected - proceed with setup
    if (user && userProfile) {
      console.log('User profile loaded but no shop selected, proceeding with setup')
      setCheckingProfile(false)
      fetchMarkets()
    }
  }, [user, userProfile, router])

  // Timeout fallback for profile checking
  useEffect(() => {
    if (checkingProfile) {
      console.log('Profile checking timeout started, will proceed in 2 seconds')
      const timeout = setTimeout(() => {
        console.log('Profile checking timeout reached, proceeding with setup')
        setCheckingProfile(false)
        fetchMarkets()
      }, 2000) // Reduced to 2 seconds

      return () => clearTimeout(timeout)
    }
  }, [checkingProfile])

  const fetchMarkets = async () => {
    try {
      // Check if markets are already cached
      const cachedMarkets = sessionStorage.getItem('markets')
      if (cachedMarkets) {
        const parsedMarkets = JSON.parse(cachedMarkets)
        setMarkets(parsedMarkets)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      setMarkets(data || [])
      // Cache markets for 5 minutes
      sessionStorage.setItem('markets', JSON.stringify(data || []))
    } catch (error) {
      console.error('Error fetching markets:', error)
      setError('Failed to load markets. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMarketChange = (marketId: string) => {
    console.log('🔄 handleMarketChange called with marketId:', marketId)
    console.log('📋 availableBlocks:', availableBlocks)
    
    // Clear previous selections first
    setSelectedBlock('')
    setSelectedShopNumber(null)
    setError('')
    
    if (marketId) {
      const blocksData = availableBlocks.map(blockLetter => ({
        id: blockLetter,
        name: blockLetter,
        market_id: marketId,
        created_at: new Date().toISOString()
      }))
      
      console.log('✅ Setting hardcoded blocks:', blocksData)
      console.log('📊 blocksData length:', blocksData.length)
      
      setSelectedMarket(marketId)
      setBlocks(blocksData)
      
      console.log('🎯 setBlocks called immediately, should trigger re-render')
      
      setTimeout(() => {
        console.log('🔍 After timeout - blocks state:', blocks)
        console.log('🔍 After timeout - blocks length:', blocks.length)
      }, 100)
    } else {
      console.log('❌ No marketId, clearing blocks')
      setSelectedMarket('')
      setBlocks([])
    }
  }

  const handleBlockChange = (blockId: string) => {
    setSelectedBlock(blockId)
    setSelectedShopNumber(null)
    setError('')
    
    if (blockId && selectedMarket) {
      checkShopAvailability(selectedMarket, blockId)
    }
  }

  const checkShopAvailability = async (marketId: string, blockLetter: string) => {
    setLoadingAvailability(true)
    const availabilityMap = new Map<string, boolean>()
    
    try {
      // Check availability for each shop number using the database function
      const availabilityChecks = await Promise.all(
        shopNumbers.map(async (shopNumber) => {
          const blockShopCode = `${blockLetter}${shopNumber}`
          
          const { data, error } = await supabase
            .rpc('check_shop_availability', {
              p_market_id: marketId,
              p_block_shop_code: blockShopCode
            })
          
          if (error) {
            console.error(`Error checking availability for ${blockShopCode}:`, error)
            return { blockShopCode, isAvailable: true } // Default to available on error
          }
          
          return { blockShopCode, isAvailable: data.available }
        })
      )
      
      // Set availability for all shop numbers
      availabilityChecks.forEach(({ blockShopCode, isAvailable }) => {
        availabilityMap.set(blockShopCode, isAvailable)
      })
      
      setShopAvailability(availabilityMap)
    } catch (error) {
      console.error('Error checking shop availability:', error)
      // On error, assume all shops are available
      shopNumbers.forEach(shopNumber => {
        availabilityMap.set(`${blockLetter}${shopNumber}`, true)
      })
      setShopAvailability(availabilityMap)
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleShopNumberChange = (shopNumber: number) => {
    setSelectedShopNumber(shopNumber)
    setError('') // Clear any previous errors
  }

  const handleContinue = async () => {
    if (!selectedMarket || !selectedBlock || !selectedShopNumber) {
      setError('Please select a market, block, and shop number.')
      return
    }

    // Double-check: Prevent selection if user already has a market/shop
    if (userProfile?.selected_market_id || userProfile?.selected_shop_id) {
      router.push('/dashboard')
      return
    }

    // Check if shop is available before proceeding
    const blockShopCombination = `${selectedBlock}${selectedShopNumber}`
    const isAvailable = shopAvailability.get(blockShopCombination) ?? true
    
    if (!isAvailable) {
      setError('This shop is already selected by another admin. Please choose a different shop.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      console.log('Saving shop selection:', { selectedMarket, selectedBlock, selectedShopNumber })
      
      // Get block name for the combination
      const block = blocks.find(b => b.id === selectedBlock)
      const blockName = block?.name || 'Unknown'
      
      // Create block+shop combination like "A25", "B63", "C75"
      const blockShopCombination = `${blockName}${selectedShopNumber}`
      
      // Use the database function to create or get the combination
      const { data: combinationId, error: combinationError } = await supabase
        .rpc('create_block_shop_combination', {
          p_market_id: selectedMarket,
          p_block_shop_code: blockShopCombination,
          p_block_letter: blockName,
          p_shop_number: selectedShopNumber
        })
      
      if (combinationError) {
        console.error('Error creating/getting combination:', combinationError)
        setError('Error creating shop combination. Please try again.')
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Select Market: Using combination ID:', combinationId)
        console.log('Select Market: Block shop combination:', blockShopCombination)
      }
      
      // Shop selection is now handled in updateUserProfile
      console.log('Shop selection will be handled in updateUserProfile')

      // Update user profile with the combination ID
      console.log('Calling updateUserProfile with combinationId:', combinationId)
      const { error } = await updateUserProfile(combinationId)
      if (error) {
        console.error('Error saving shop selection:', error)
        setError(`Error saving shop selection: ${error.message}`)
        return
      }
      
      console.log('Shop selection saved successfully, waiting for profile update...')
      // Wait a bit longer to ensure profile is updated in context
      setTimeout(() => {
        console.log('Redirecting to dashboard after profile update')
        router.push('/dashboard')
      }, 500)
    } catch (error) {
      console.error('Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {checkingProfile ? 'Checking your account...' : 'Loading markets...'}
          </p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we verify your account...</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4">
              <button
                onClick={() => {
                  console.log('Debug info:', {
                    loading,
                    checkingProfile,
                    userProfile,
                    hasUser: !!user
                  })
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
              >
                Debug Loading State
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // If user already has a selection, show a message instead of the form
  if (userProfile?.selected_market_id || userProfile?.selected_shop_id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Complete</h2>
            <p className="text-gray-600 mb-6">
              You have already selected your market and shop. This selection cannot be changed.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Go to Dashboard
              </button>
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => {
                    console.log('Current user profile:', userProfile)
                    console.log('Current user:', user)
                    console.log('Has market ID:', !!userProfile?.selected_market_id)
                    console.log('Has shop ID:', !!userProfile?.selected_shop_id)
                    console.log('Has combination ID:', !!userProfile?.selected_block_shop_combination_id)
                  }}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md text-sm"
                >
                  Debug Profile Data
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">One-Time Shop Setup</h1>
          <p className="mt-2 text-gray-600">Choose your market, block, and shop (this can only be done once)</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4">
              <button
                onClick={() => {
                  console.log('Debug info:', {
                    user,
                    userProfile,
                    selectedMarket,
                    selectedBlock,
                    selectedShopNumber,
                    markets: markets.length,
                    blocks: blocks.length
                  })
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
              >
                Debug Current State
              </button>
            </div>
          )}
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Permanent Selection
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>This selection is permanent and cannot be changed later. Each account can only select a market and shop once. Please choose carefully.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleContinue(); }} className="space-y-6">
          {/* Market Selection */}
          <div>
            <label htmlFor="market" className="block text-sm font-medium text-gray-700 mb-2">
              Select Market *
            </label>
            <select
              id="market"
              value={selectedMarket}
              onChange={(e) => handleMarketChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Choose a market...</option>
              {markets.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.name}
                </option>
              ))}
            </select>
          </div>

          {/* Block Selection */}
          <div>
            <label htmlFor="block" className="block text-sm font-medium text-gray-700 mb-2">
              Select Block *
            </label>
            <select
              id="block"
              value={selectedBlock}
              onChange={(e) => handleBlockChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!selectedMarket}
              required
            >
              <option value="">Choose a block...</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  Block {block.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shop Number Selection */}
          <div>
            <label htmlFor="shopNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Select Shop Number *
            </label>
            <select
              id="shopNumber"
              value={selectedShopNumber || ''}
              onChange={(e) => handleShopNumberChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!selectedBlock}
              required
            >
              <option value="">Choose a shop number...</option>
              {shopNumbers.map((number) => {
                const blockShopCode = `${selectedBlock}${number}`
                const isAvailable = shopAvailability.get(blockShopCode) ?? true
                return (
                  <option 
                    key={number} 
                    value={number}
                    disabled={!isAvailable}
                  >
                    Shop {number} {!isAvailable ? '(Unavailable)' : ''}
                  </option>
                )
              })}
            </select>
            {loadingAvailability && (
              <p className="mt-1 text-sm text-gray-500">Checking shop availability...</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !selectedMarket || !selectedBlock || !selectedShopNumber}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Setting up...' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

