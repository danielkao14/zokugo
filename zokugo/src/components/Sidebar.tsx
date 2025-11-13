'use client'

import { MessageCircle, BookOpen, BarChart3, User as UserIcon, LogOut, Book, Disc3 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface SidebarProps {
  isDictionaryOpen: boolean
  onToggleDictionary: () => void
}

export default function Sidebar({ isDictionaryOpen, onToggleDictionary }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', icon: Book, label: 'Dashboard' },
    { href: '/conversation', icon: MessageCircle, label: 'Free Conversation' },
    { href: '/scenario', icon: BookOpen, label: 'Scenario Practice' },
    { href: '/storyboard', icon: Disc3, label: 'Storyboard' },
    {href: '/flashcards', icon: Book, label: 'Flashcards' },
    { href: '/review', icon: BarChart3, label: 'Review & Feedback' },
    { href: '/profile', icon: UserIcon, label: 'Profile' },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Zokugo</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
        
        {/* Dictionary Toggle */}
        <div className="pt-2 border-t border-gray-200 mt-2">
          <button
            onClick={onToggleDictionary}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isDictionaryOpen
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Book size={20} />
            <span className="font-medium">Dictionary</span>
          </button>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserIcon size={20} className="text-gray-600" />
            <span className="text-sm text-gray-700 truncate">
              {user?.name || user?.email}
            </span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  )
}