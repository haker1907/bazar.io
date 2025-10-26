'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ImageSliderProps {
  images: string[]
  alt?: string
  className?: string
  showThumbnails?: boolean
  showFullscreen?: boolean
  onRemove?: (index: number) => void
  canEdit?: boolean
}

export default function ImageSlider({
  images,
  alt = 'Product images',
  className = '',
  showThumbnails = true,
  showFullscreen = true,
  onRemove,
  canEdit = false
}: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0])) // Pre-load first image

  // Lazy load images when they come into view
  const loadImage = useCallback((index: number) => {
    setLoadedImages(prev => new Set([...prev, index]))
  }, [])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex === 0 ? images.length - 1 : prevIndex - 1
      loadImage(newIndex) // Pre-load the image
      return newIndex
    })
  }, [images.length, loadImage])

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex === images.length - 1 ? 0 : prevIndex + 1
      loadImage(newIndex) // Pre-load the image
      return newIndex
    })
  }, [images.length, loadImage])

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
    loadImage(index) // Pre-load the image
  }, [loadImage])

  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📷</div>
          <p>No images available</p>
        </div>
      </div>
    )
  }

  const openFullscreen = () => {
    if (showFullscreen) {
      setIsFullscreen(true)
    }
  }

  const closeFullscreen = () => {
    setIsFullscreen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeFullscreen()
    } else if (e.key === 'ArrowLeft') {
      goToPrevious()
    } else if (e.key === 'ArrowRight') {
      goToNext()
    }
  }

  const SliderContent = ({ isFullscreen = false }) => (
    <div 
      className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Main Image */}
      <div className={`relative ${isFullscreen ? 'h-full' : 'aspect-square'}`}>
        {loadedImages.has(currentIndex) ? (
          <Image
            src={images[currentIndex]}
            alt={`${alt} ${currentIndex + 1}`}
            fill
            className="object-cover rounded-lg"
            priority={currentIndex === 0}
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          </div>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Remove Button */}
        {canEdit && onRemove && (
          <button
            onClick={() => onRemove(currentIndex)}
            className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Fullscreen Button */}
        {showFullscreen && !isFullscreen && (
          <button
            onClick={openFullscreen}
            className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        )}

        {/* Close Fullscreen Button */}
        {isFullscreen && (
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="flex space-x-2 mt-4 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                index === currentIndex
                  ? 'border-blue-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Image
                src={image}
                alt={`${alt} thumbnail ${index + 1}`}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className={`${className}`}>
        <SliderContent />
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="max-w-7xl max-h-full p-4">
            <SliderContent isFullscreen />
          </div>
        </div>
      )}
    </>
  )
}
