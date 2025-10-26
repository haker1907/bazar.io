'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Product, Shop } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import ProductModal from '@/components/ProductModal'
import ImageSlider from '@/components/ImageSlider'

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const { user, userProfile, signOut } = useAuth()
  const router = useRouter()

  const fetchShopAndProducts = useCallback(async () => {
    try {
      setLoading(true)
      
      // Debug info (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Dashboard: Full user profile data:', userProfile)
        console.log('Dashboard: Using user profile data:', {
          selected_shop_id: userProfile?.selected_shop_id,
          selected_market_id: userProfile?.selected_market_id,
          selected_block_shop_combination_id: userProfile?.selected_block_shop_combination_id
        })
      }
      
      // Check if user profile is loaded and has required fields
      if (!userProfile) {
        console.log('User profile not loaded yet, skipping fetch')
        return
      }
      
      // Use the user profile data directly
      if (!userProfile?.selected_block_shop_combination_id || !userProfile?.selected_market_id) {
        console.log('No market selection found in user profile - redirecting to select-market')
        router.push('/select-market')
        return
      }
      
      const combinationId = userProfile.selected_block_shop_combination_id
      const marketId = userProfile.selected_market_id
      
      // PARALLEL DATABASE QUERIES - Major Performance Improvement
      const [marketResult, combinationResult] = await Promise.allSettled([
        supabase
          .from('markets')
          .select('name') // Only fetch required field
          .eq('id', marketId)
          .single(),
        supabase
          .from('block_shop_combinations')
          .select('id, block_letter, shop_number, block_shop_code')
          .eq('id', combinationId)
          .single()
      ])
      
      // Handle market data
      const marketData = marketResult.status === 'fulfilled' ? marketResult.value.data : null
      
      // Handle combination data
      if (combinationResult.status === 'rejected') {
        console.warn('Could not find block+shop combination')
        setProducts([])
        return
      }

      const combinationData = combinationResult.value.data
      if (!combinationData) {
        console.warn('No combination data found')
        setProducts([])
        return
      }

      // Set shop data for display
      setShop({
        id: combinationData.id,
        name: combinationData.shop_number.toString(),
        block_id: combinationData.block_letter,
        created_at: new Date().toISOString(),
        blocks: {
          name: combinationData.block_letter,
          markets: {
            name: marketData?.name || 'Unknown Market'
          }
        }
      })

      // Fetch products with optimized query - only essential fields for list view
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, price, image_url, images, block_shop_combination_id, created_at')
        .eq('block_shop_combination_id', combinationData.id)
        .order('created_at', { ascending: false })
        .limit(50) // Limit for better performance

      if (productsError) {
        console.error('Error fetching products:', productsError)
        setProducts([])
        return
      }

      setProducts(productsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [userProfile, router])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!userProfile?.selected_shop_id) {
      router.push('/select-market')
      return
    }

    fetchShopAndProducts()
  }, [user, userProfile, router, fetchShopAndProducts])

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      // Remove from local state
      setProducts(products.filter(p => p.id !== productId))
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product')
    }
  }

  const handleAddProduct = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  const handleProductSaved = () => {
    // Refresh products list
    if (userProfile?.selected_shop_id) {
      fetchShopAndProducts()
    }
  }

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.push('/login')
  }, [signOut, router])

  // Memoize expensive image processing to prevent unnecessary re-renders
  const processedProducts = useMemo(() => {
    return products.map((product) => {
      // Get all images (from images array and fallback to image_url)
      const allImages = []
      if (product.images && product.images.length > 0) {
        allImages.push(...product.images)
      } else if (product.image_url) {
        allImages.push(product.image_url)
      }
      
      return {
        ...product,
        allImages,
        hasImages: allImages.length > 0
      }
    })
  }, [products])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  {shop && (
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">Market:</span> 
                        <span className="text-indigo-600 font-semibold">{shop.blocks?.markets?.name}</span>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">Block:</span> 
                        <span className="text-purple-600 font-semibold">{shop.blocks?.name}</span>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">Shop:</span> 
                        <span className="text-blue-600 font-semibold">{shop.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleAddProduct}
                className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium">Add Product</span>
                </div>
              </button>
              <button
                onClick={handleSignOut}
                className="group bg-white/80 backdrop-blur-sm text-gray-700 px-6 py-3 rounded-xl hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium">Sign Out</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{processedProducts.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">With Images</p>
                  <p className="text-2xl font-bold text-gray-900">{processedProducts.filter(p => p.hasImages).length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${processedProducts.reduce((sum, p) => sum + p.price, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  My Products
                </h2>
                <p className="text-gray-600 mt-1">Manage your shop&apos;s products with ease</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Dashboard</span>
              </div>
            </div>
          </div>

          {processedProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative">
                <div className="text-8xl mb-6 animate-bounce">📦</div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No products yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Start building your inventory by adding your first product. It&apos;s quick and easy!</p>
              <button
                onClick={handleAddProduct}
                className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium">Add Your First Product</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {processedProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.6s ease-out forwards'
                  }}
                >
                  <div className="relative h-56 overflow-hidden">
                    {product.hasImages ? (
                      <div className="relative h-full">
                        <ImageSlider
                          images={product.allImages}
                          alt={product.name}
                          className="h-full"
                          showThumbnails={false}
                          showFullscreen={true}
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-gray-700 shadow-lg">
                          {product.allImages.length} image{product.allImages.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                        <div className="text-center text-gray-500 group-hover:text-gray-600 transition-colors">
                          <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">📷</div>
                          <p className="text-sm font-medium">No images</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors duration-200 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          ${product.price}
                        </span>
                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                        <span className="text-sm text-gray-500 font-medium">Price</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{new Date(product.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="group/edit flex-1 bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 px-4 py-3 rounded-xl text-center text-sm font-medium hover:from-indigo-100 hover:to-indigo-200 hover:text-indigo-800 transition-all duration-200 transform hover:scale-105 border border-indigo-200"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-4 h-4 group-hover/edit:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="group/delete flex-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 px-4 py-3 rounded-xl text-center text-sm font-medium hover:from-red-100 hover:to-red-200 hover:text-red-800 transition-all duration-200 transform hover:scale-105 border border-red-200"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-4 h-4 group-hover/delete:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        product={editingProduct}
        onProductSaved={handleProductSaved}
      />
    </div>
  )
}
