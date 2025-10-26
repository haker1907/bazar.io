'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase, Product } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product?: Product | null
  onProductSaved: () => void
}

export default function ProductModal({ isOpen, onClose, product, onProductSaved }: ProductModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { userProfile } = useAuth()

  const isEdit = !!product

  useEffect(() => {
    if (isOpen) {
      if (product) {
        // Edit mode - populate form with existing data
        setName(product.name)
        setDescription(product.description)
        setPrice(product.price.toString())
        setImagePreview(product.image_url || '')
        setImage(null)
      } else {
        // Add mode - reset form
        setName('')
        setDescription('')
        setPrice('')
        setImagePreview('')
        setImage(null)
      }
      
      // Shop details are not needed in the modal
    }
  }, [isOpen, product, userProfile])


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `product-images/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isEdit && !image) {
      alert('Please select an image')
      return
    }

    setLoading(true)

    try {
      let imageUrl = product?.image_url

      // Upload new image if one was selected
      if (image) {
        imageUrl = await uploadImage(image)
      }

      if (isEdit && product) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name,
            description,
            price: parseFloat(price),
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id)

        if (error) throw error
      } else {
        // Create new product - need to find block_shop_combination_id
        if (!userProfile?.selected_shop_id) {
          throw new Error('No shop selected')
        }

        // Use the new simple format - get data directly from user profile
        if (!userProfile.selected_block_shop_combination_id || !userProfile.selected_market_id) {
          throw new Error('No shop selection found in user profile')
        }
        
        const combinationId = userProfile.selected_block_shop_combination_id
        const marketId = userProfile.selected_market_id
        
        console.log('ProductModal: Using combination ID:', combinationId, 'Market ID:', marketId)

        // Get the block_shop_combination details using the combination ID
        const { data: combinationData, error: combinationError } = await supabase
          .from('block_shop_combinations')
          .select('id, market_id, block_letter, shop_number, block_shop_code')
          .eq('id', combinationId)
          .single()

        if (combinationError) {
          console.error('Error fetching combination data:', combinationError)
          throw new Error('Could not find shop combination')
        }

        const { error } = await supabase
          .from('products')
          .insert({
            name,
            description,
            price: parseFloat(price),
            image_url: imageUrl,
            block_shop_combination_id: combinationData.id,
          })

        if (error) throw error
      }

      onProductSaved()
      onClose()
    } catch (error) {
      console.error('Error saving product:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error saving product: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-2 border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isEdit ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 6v6m0 0v6m0-6h6m-6 0H6"} />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Name */}
          <div>
            <label htmlFor="name" className="block text-base font-semibold text-gray-900 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-4 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg shadow-sm placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
              placeholder="Enter product name"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-base font-semibold text-gray-900 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full px-4 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg shadow-sm placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors resize-vertical"
              placeholder="Enter product description"
              style={{ fontSize: '16px', lineHeight: '1.6' }}
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-base font-semibold text-gray-900 mb-2">
              Price ($) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-lg">$</span>
              <input
                type="number"
                id="price"
                required
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 block w-full pl-9 pr-4 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg shadow-sm placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
                placeholder="0.00"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>


          {/* Image Upload */}
          <div>
            <label htmlFor="image" className="block text-base font-semibold text-gray-900 mb-2">
              Product Image {!isEdit && '*'}
            </label>
            <div className="mt-2">
              <label htmlFor="image" className="flex flex-col items-center justify-center w-full px-4 py-6 bg-white border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-all duration-200">
                <div className="flex flex-col items-center justify-center text-center">
                  <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-base font-semibold text-gray-700">
                    <span className="text-indigo-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  required={!isEdit}
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
            {!isEdit && (
              <p className="mt-2 text-sm font-medium text-indigo-600">
                * Required for new products
              </p>
            )}
            {isEdit && (
              <p className="mt-2 text-sm font-medium text-gray-600">
                Leave empty to keep current image
              </p>
            )}
            {imagePreview && (
              <div className="mt-4 flex justify-center">
                <div className="relative">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={160}
                    height={160}
                    className="w-40 h-40 object-cover rounded-lg border-2 border-gray-200 shadow-md"
                  />
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-base font-semibold border-2 border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-base font-semibold border-2 border-transparent rounded-lg shadow-md text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEdit ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isEdit ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 6v6m0 0v6m0-6h6m-6 0H6"} />
                  </svg>
                  {isEdit ? 'Update Product' : 'Add Product'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
