'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { User, Mail, Calendar, TrendingUp, MessageSquare, Award } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    daysStreak: 0,
    favoriteScenario: 'None yet'
  })

  useEffect(() => {
    loadProfile()
    loadStats()
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setName(data.name || '')
        setBio(data.bio || '')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!user) return

    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      if (conversations) {
        const totalMessages = conversations.reduce(
          (sum, conv) => sum + conv.messages.filter((m: any) => m.role === 'user').length,
          0
        )

        // Find most common scenario type
        const scenarioCounts: { [key: string]: number } = {}
        conversations.forEach(conv => {
          if (conv.type !== 'free') {
            scenarioCounts[conv.type] = (scenarioCounts[conv.type] || 0) + 1
          }
        })
        
        const favoriteScenario = Object.entries(scenarioCounts).length > 0
          ? Object.entries(scenarioCounts).sort((a, b) => b[1] - a[1])[0][0]
          : 'None yet'

        // Calculate streak (simplified - would need more complex logic in production)
        const daysStreak = conversations.length > 0 ? Math.min(conversations.length, 7) : 0

        setStats({
          totalConversations: conversations.length,
          totalMessages,
          daysStreak,
          favoriteScenario: formatScenarioName(favoriteScenario)
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const formatScenarioName = (scenarioId: string) => {
    const scenarioNames: { [key: string]: string } = {
      restaurant: 'Restaurant',
      interview: 'Job Interview',
      shopping: 'Shopping',
      directions: 'Asking Directions',
      hotel: 'Hotel Check-in'
    }
    return scenarioNames[scenarioId] || scenarioId
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name,
          bio,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      alert('Profile saved successfully! 🎉')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Profile</h1>
        </div>

        {/* Profile Information Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start gap-6 mb-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <User size={48} className="text-white" />
              </div>
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                {name || 'daniel kao REPLACE W BACKEND'}
              </h2>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Mail size={16} />
                <span className="text-sm">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar size={16} />
                <span className="text-sm">
                  Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                About Me
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Why are you learning Japanese? What are your goals? {insert a bio here}"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                {bio.length} characters
              </p>
            </div>
            
            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </span>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </div>

        {/* Learning Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-purple-600" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Learning Statistics</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
              <MessageSquare className="mx-auto mb-2 text-purple-600" size={32} />
              <div className="text-3xl font-bold text-purple-700 mb-1">
                {stats.totalConversations}
              </div>
              <div className="text-sm text-gray-600">Conversations</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
              <MessageSquare className="mx-auto mb-2 text-blue-600" size={32} />
              <div className="text-3xl font-bold text-blue-700 mb-1">
                {stats.totalMessages}
              </div>
              <div className="text-sm text-gray-600">Messages Sent</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center">
              <Award className="mx-auto mb-2 text-orange-600" size={32} />
              <div className="text-3xl font-bold text-orange-700 mb-1">
                {stats.daysStreak}
              </div>
              <div className="text-sm text-gray-600">Day Streak 🔥</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
              <Award className="mx-auto mb-2 text-green-600" size={32} />
              <div className="text-lg font-bold text-green-700 mb-1 truncate">
                {stats.favoriteScenario}
              </div>
              <div className="text-sm text-gray-600">Favorite Scenario</div>
            </div>
          </div>
        </div>

        {/* Progress & Achievements */}

        {/* Learning Tips */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Study Tips!</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">•</span>
              <span>Practice daily for at least 10 minutes to build consistency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">•</span>
              <span>Try different scenarios to expand your vocabulary</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">•</span>
              <span>Use both typing and voice input to improve pronunciation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">•</span>
              <span>Review your conversations regularly to track improvement</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}