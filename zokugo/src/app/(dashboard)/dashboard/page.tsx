// File: src/app/(dashboard)/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { getProfile } from '@/lib/backend'
import { MessageCircle, BookOpen, BarChart3, User, ArrowRight, TrendingUp } from 'lucide-react'

interface QuickStats {
  totalConversations: number
  totalMessages: number
  lastActivity: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [stats, setStats] = useState<QuickStats>({
    totalConversations: 0,
    totalMessages: 0,
    lastActivity: null
  })
  const [greeting, setGreeting] = useState('')
  const [name, setName] = useState('Learner')


  useEffect(() => {
    setGreeting(getTimeBasedGreeting())
    if (user) {
      loadQuickStats()
    }
  }, [user])

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'おはようございます'
    if (hour < 18) return 'こんにちは'
    return 'こんばんは'
  }

  const loadQuickStats = async () => {
    if (!user) return

    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (conversations && conversations.length > 0) {
        const totalMessages = conversations.reduce(
          (sum, conv) => sum + conv.messages.filter((m: any) => m.role === 'user').length,
          0
        )

        setStats({
          totalConversations: conversations.length,
          totalMessages,
          lastActivity: conversations[0].created_at
        })

        
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }

    try {
      const profileRes = await getProfile(user.id)
      // profileRes has shape { data: any; error: any } | { data: null; error: any }
      if ('error' in profileRes && profileRes.error) {
        console.error('Error fetching profile:', profileRes.error)
      } else if ('data' in profileRes && profileRes.data) {
        setName(profileRes.data.username || 'Learner')
      }
    }
    catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const menuItems = [
    {
      title: 'Free Conversation',
      description: 'Practice Japanese in an open, natural conversation with AI',
      icon: MessageCircle,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      route: '/conversation',
      emoji: '💬'
    },
    {
      title: 'Scenario Practice',
      description: 'Role-play real-world situations like ordering at restaurants or job interviews',
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      route: '/scenario',
      emoji: '🎭'
    },
    {
      title: 'Review & Feedback',
      description: 'Get AI-powered feedback on your conversations and track your progress',
      icon: BarChart3,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
      route: '/review',
      emoji: '📊'
    },
    {
      title: 'Profile',
      description: 'Manage your account settings and view your learning achievements',
      icon: User,
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700',
      route: '/profile',
      emoji: '👤'
    }
  ]

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'No activity yet'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto p-6 space-y-8 pb-12">
        {/* Welcome Header */}
        <div className="text-center pt-8 pb-4">
          <h1 className="text-5xl font-bold text-gray-800 mb-3">
            {greeting}
          </h1>
          <p className="text-xl text-gray-600">
            Welcome back, <span className="font-semibold text-purple-600">{name || 'Learner'}</span>
          </p>
          <p className="text-gray-500 mt-2">What would you like to practice today?</p>
        </div>

        {/* Quick Stats Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-purple-600" size={24} />
            <h2 className="text-lg font-bold text-gray-800">Your Progress</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageCircle className="text-purple-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-700">
                  {stats.totalConversations}
                </div>
                <div className="text-sm text-gray-600">Total Conversations</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">
                  {stats.totalMessages}
                </div>
                <div className="text-sm text-gray-600">Messages Sent</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="text-green-600" size={24} />
              </div>
              <div>
                <div className="text-lg font-bold text-green-700">
                  {formatLastActivity(stats.lastActivity)}
                </div>
                <div className="text-sm text-gray-600">Last Activity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Menu */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Choose Your Practice Mode
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              
              return (
                <button
                  key={index}
                  onClick={() => router.push(item.route)}
                  className={`group relative bg-gradient-to-br ${item.color} ${item.hoverColor} text-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left overflow-hidden transform hover:scale-105`}
                >
                  {/* Background Pattern */}
                  <div className="absolute top-0 right-0 opacity-10">
                    <div className="text-9xl">{item.emoji}</div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">
                      {item.title}
                    </h3>
                    <ArrowRight 
                        size={24} 
                        className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 flex-shrink-0" 
                      />
                    
                    <p className="text-white text-opacity-90 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Hover Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transform -skew-x-12 group-hover:translate-x-full transition-all duration-700"></div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Today's Learning Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3 p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl">🎤</div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Use Voice Input</div>
                <div className="text-sm text-gray-600">
                  Practice pronunciation by speaking your responses out loud
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl">📝</div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Review Your Chats</div>
                <div className="text-sm text-gray-600">
                  Look back at previous conversations to see your improvement
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-green-50 rounded-xl">
              <div className="text-2xl">🎭</div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Try New Scenarios</div>
                <div className="text-sm text-gray-600">
                  Challenge yourself with different conversation situations
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-orange-50 rounded-xl">
              <div className="text-2xl">⏰</div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Set a Daily Goal</div>
                <div className="text-sm text-gray-600">
                  Just 10 minutes a day can make a huge difference
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}