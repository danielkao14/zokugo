'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useResizable } from '@/hooks/useResizable'
import Sidebar from '@/components/Sidebar'
import Dictionary from '@/components/Dictionary'
import { GripVertical } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false)
  
  const { width: dictionaryWidth, isResizing, startResizing } = useResizable({
    minWidth: 300,
    maxWidth: 600,
    defaultWidth: 400,
    storageKey: 'dictionary-width'
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar 
        isDictionaryOpen={isDictionaryOpen}
        onToggleDictionary={() => setIsDictionaryOpen(!isDictionaryOpen)}
      />
      
      {/* Main Content Area */}
      <div className="flex flex-1 relative">
        {/* Main Content */}
        <main 
          className="flex-1 overflow-hidden transition-all duration-300"
          style={{
            marginRight: isDictionaryOpen ? `${dictionaryWidth}px` : '0px'
          }}
        >
          {children}
        </main>

        {/* Resize Handle */}
        {isDictionaryOpen && (
          <div
            onMouseDown={startResizing}
            className={`absolute top-0 bottom-0 w-1 hover:w-2 bg-gray-300 hover:bg-purple-500 cursor-col-resize transition-all z-20 flex items-center justify-center group ${
              isResizing ? 'bg-purple-600 w-2' : ''
            }`}
            style={{
              right: `${dictionaryWidth}px`,
            }}
          >
            <div className="absolute inset-y-0 -left-2 -right-2 flex items-center justify-center">
              <GripVertical 
                size={16} 
                className="text-gray-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        )}

        {/* Dictionary Panel */}
        <div
          className={`absolute top-0 bottom-0 right-0 bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 ease-in-out z-10 ${
            isDictionaryOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            width: `${dictionaryWidth}px`,
          }}
        >
          <Dictionary onClose={() => setIsDictionaryOpen(false)} />
        </div>
      </div>
    </div>
  )
}