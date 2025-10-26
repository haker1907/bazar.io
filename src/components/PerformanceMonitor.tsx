'use client'

import { useEffect, useRef } from 'react'

export default function PerformanceMonitor() {
  const observerRef = useRef<PerformanceObserver | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loggedResources = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return

    // Debounce performance monitoring to reduce overhead
    const debouncedLog = (message: string, data: unknown) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        console.warn(message, data)
      }, 2000) // Increased debounce to 2 seconds
    }

    // Monitor performance with reduced overhead
    try {
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        // Process entries in batches to reduce overhead
        const slowResources: PerformanceResourceTiming[] = []
        let navigationTime = 0
        
        for (const entry of entries) {
          if (entry.entryType === 'navigation') {
            navigationTime = entry.duration
          }
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming
            // Only track resources slower than 8 seconds to reduce noise
            if (resource.duration > 8000) {
              // Avoid logging the same resource multiple times
              if (!loggedResources.current.has(resource.name)) {
                slowResources.push(resource)
                loggedResources.current.add(resource.name)
              }
            }
          }
        }

        // Log navigation time only if very slow
        if (navigationTime > 5000) { // Only log very slow page loads
          debouncedLog('Very Slow Page Load:', navigationTime + 'ms')
        }

        // Log slow resources in batch
        if (slowResources.length > 0) {
          debouncedLog('Slow Resources Detected:', slowResources.map(r => ({
            name: r.name,
            duration: Math.round(r.duration) + 'ms',
            type: r.initiatorType || 'unknown'
          })))
        }
      })

      observerRef.current.observe({ entryTypes: ['navigation', 'resource'] })
    } catch (error) {
      console.warn('Performance monitoring not supported:', error)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return null
}



