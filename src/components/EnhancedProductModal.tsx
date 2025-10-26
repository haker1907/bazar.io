'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase, Product } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product?: Product | null
  onProductSaved: () => void
}

export default function EnhancedProductModal({ isOpen, onClose, product, onProductSaved }: ProductModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { userProfile } = useAuth()

  const isEdit = !!product
  const maxImages = 5

  useEffect(() => {
    if (isOpen) {
      if (product) {
        // Edit mode - populate form with existing data
        setName(product.name)
        setDescription(product.description)
        setPrice(product.price.toString())
        setExistingImages(product.images || [])
        setImagePreviews([])
        setImages([])
        setCurrentImageIndex(0)
      } else {
        // Add mode - reset form
        setName('')
        setDescription('')
        setPrice('')
        setExistingImages([])
        setImagePreviews([])
        setImages([])
        setCurrentImageIndex(0)
      }
    }
  }, [isOpen, product])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = maxImages - existingImages.length - images.length
    
    if (files.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more images (max ${maxImages} total)`)
      return
    }

    const newImages = [...images, ...files.slice(0, remainingSlots)]
    setImages(newImages)

    // Create previews for new images
    const newPreviews: string[] = []
    files.slice(0, remainingSlots).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string)
        if (newPreviews.length === files.slice(0, remainingSlots).length) {
          setImagePreviews(prev => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImages(newImages)
    setImagePreviews(newPreviews)
    
    if (currentImageIndex >= newImages.length + existingImages.length) {
      setCurrentImageIndex(Math.max(0, newImages.length + existingImages.length - 1))
    }
  }

  const removeExistingImage = (index: number) => {
    const newExistingImages = existingImages.filter((_, i) => i !== index)
    setExistingImages(newExistingImages)
    
    if (currentImageIndex >= newExistingImages.length + images.length) {
      setCurrentImageIndex(Math.max(0, newExistingImages.length + images.length - 1))
    }
  }

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `product-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    })

    return Promise.all(uploadPromises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isEdit && images.length === 0) {
      alert('Please select at least one image')
      return
    }

    setLoading(true)

    try {
      let allImageUrls = [...existingImages]

      // Upload new images if any were selected
      if (images.length > 0) {
        const newImageUrls = await uploadImages(images)
        allImageUrls = [...allImageUrls, ...newImageUrls]
      }

      // Ensure we don't exceed max images
      if (allImageUrls.length > maxImages) {
        allImageUrls = allImageUrls.slice(0, maxImages)
      }

      if (isEdit && product) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name,
            description,
            price: parseFloat(price),
            images: allImageUrls,
            image_url: allImageUrls[0] || '', // Keep first image as primary
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id)

        if (error) throw error
      } else {
        // Create new product
        if (!userProfile?.selected_block_shop_combination_id) {
          throw new Error('No shop selected')
        }

        const combinationId = userProfile.selected_block_shop_combination_id

        const { data: combinationData, error: combinationError } = await supabase
          .from('block_shop_combinations')
          .select('id')
          .eq('id', combinationId)
          .single()

        if (combinationError) {
          console.error('Error finding block shop combination:', combinationError)
          throw new Error('Could not find shop combination')
        }

        const { error } = await supabase
          .from('products')
          .insert({
            name,
            description,
            price: parseFloat(price),
            images: allImageUrls,
            image_url: allImageUrls[0] || '', // First image as primary
            block_shop_combination_id: combinationData.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (error) throw error
      }

      onProductSaved()
      onClose()
    } catch (error) {
      console.error('Error saving product:', error)
      alert(`Error saving product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const allImages = [...existingImages, ...imagePreviews]
  const totalImages = allImages.length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Images Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images ({totalImages}/{maxImages})
              </label>
              
              {/* Image Slider */}
              {totalImages > 0 && (
                <div className="mb-4">
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <div className="aspect-video relative">
                      <Image
                        src={allImages[currentImageIndex]}
                        alt={`Product image ${currentImageIndex + 1}`}
                        fill
                        className="object-cover"
                      />
                      
                      {/* Navigation arrows */}
                      {totalImages > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setCurrentImageIndex((prev) => 
                              prev === 0 ? totalImages - 1 : prev - 1
                            )}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentImageIndex((prev) => 
                              prev === totalImages - 1 ? 0 : prev + 1
                            )}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                          >
                            ›
                          </button>
                        </>
                      )}
                      
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (currentImageIndex < existingImages.length) {
                            removeExistingImage(currentImageIndex)
                          } else {
                            removeImage(currentImageIndex - existingImages.length)
                          }
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-all"
                      >
                        ×
                      </button>
                    </div>
                    
                    {/* Image indicators */}
                    <div className="flex justify-center space-x-2 p-2">
                      {allImages.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex 
                              ? 'bg-blue-500' 
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Upload button */}
              {totalImages < maxImages && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
                  >
                    <div className="text-gray-500">
                      <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p>Click to upload images ({maxImages - totalImages} remaining)</p>
                      <p className="text-sm">PNG, JPG, GIF up to 10MB each</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>


            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : (isEdit ? 'Update Product' : 'Add Product')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

