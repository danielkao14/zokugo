import { useState, useEffect, useCallback } from 'react'

interface UseResizableOptions {
  minWidth: number
  maxWidth: number
  defaultWidth: number
  storageKey?: string
}

export function useResizable({
  minWidth,
  maxWidth,
  defaultWidth,
  storageKey = 'resizable-width'
}: UseResizableOptions) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)

  // Load saved width from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(storageKey)
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10)
        if (parsed >= minWidth && parsed <= maxWidth) {
          setWidth(parsed)
        }
      }
    }
  }, [minWidth, maxWidth, storageKey])

  // Save width to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, width.toString())
    }
  }, [width, storageKey])

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (movementX: number) => {
      if (!isResizing) return

      setWidth((prevWidth) => {
        const newWidth = prevWidth - movementX // Subtract because we're dragging from the left edge
        return Math.min(Math.max(newWidth, minWidth), maxWidth)
      })
    },
    [isResizing, minWidth, maxWidth]
  )

  // Handle mouse events
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      resize(e.movementX)
    }

    const handleMouseUp = () => {
      stopResizing()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resize, stopResizing])

  return {
    width,
    isResizing,
    startResizing,
  }
}
