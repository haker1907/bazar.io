'use client'

import { useEffect, useState } from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
  fullScreen?: boolean
}

export default function LoadingSpinner({ 
  size = 'medium', 
  text = 'Loading...', 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const [showSpinner, setShowSpinner] = useState(false)

  useEffect(() => {
    // Delay showing spinner to avoid flash for fast loads
    const timer = setTimeout(() => {
      setShowSpinner(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  if (!showSpinner) return null

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`} />
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

