// File: src/app/(dashboard)/review/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as backend from '@/lib/backend'
import { Conversation } from '@/types'
import { BarChart3, MessageSquare, Sparkles, CheckCircle, AlertCircle, TrendingUp, BookOpen } from 'lucide-react'

interface GrammarPoint {
  mistake: string
  correction: string
  explanation: string
  example: string
}

interface Review {
  overallScore: number
  strengths: string[]
  areasForImprovement: string[]
  grammarPoints: GrammarPoint[]
  vocabularyRecommendations: string[]
  styleNotes: string[]
  nextSteps: string[]
}

export default function ReviewPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  const loadConversations = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await backend.getConversations(user.id)
    if (data) {
      setConversations(data)
    }
    setLoading(false)
  }

  const generateReview = async (conversation: Conversation) => {
    if (!user) return
    
    setSelectedConversation(conversation)
    setReview(null)
    setGenerating(true)

    try {
      const { data, error } = await backend.generateConversationReview(conversation.messages)
      
      if (error) throw error
      
      if (data) {
        setReview(data)
      }
    } catch (error) {
      console.error('Error generating review:', error)
      alert('Failed to generate review. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const resetView = () => {
    setSelectedConversation(null)
    setReview(null)
  }

  // Conversation Selection View
  if (!selectedConversation) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="text-center pt-8 pb-4">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              📊 Conversation Review
            </h1>
            <p className="text-gray-600">
              Get AI-powered feedback on your Japanese conversations
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-dashed border-gray-300">
              <MessageSquare size={64} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg mb-2">No conversations yet</p>
              <p className="text-sm text-gray-400">
                Start practicing to see your progress!
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Select a conversation to review
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conversations.map((conv) => {
                  const userMessages = conv.messages.filter(m => m.role === 'user')
                  const firstUserMessage = userMessages[0]?.content || 'No messages'
                  const date = new Date(conv.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })

                  return (
                    <button
                      key={conv.id}
                      onClick={() => generateReview(conv)}
                      className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 hover:border-purple-500 hover:shadow-md transition text-left"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="text-xs text-purple-600 font-semibold mb-2">
                            {conv.type === 'free' ? 'FREE CONVERSATION' : conv.type.toUpperCase()}
                          </div>
                          <p className="text-gray-800 font-medium line-clamp-2">
                            {firstUserMessage}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{date}</span>
                        <span>•</span>
                        <span>{conv.messages.length} messages</span>
                        <span>•</span>
                        <span>{userMessages.length} exchanges</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm text-purple-600 font-medium">
                        <Sparkles size={16} />
                        Generate Review
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Review Display View
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={resetView}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Back to conversations
          </button>
        </div>

        {generating ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Analyzing your conversation...
            </h2>
            <p className="text-gray-600">
              Our AI is reviewing your Japanese for grammar, vocabulary, and style
            </p>
          </div>
        ) : review ? (
          <div className="space-y-6">
            {/* Overall Score Card */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg p-8 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold">Conversation Review</h2>
                <div className="text-right">
                  <div className="text-5xl font-bold">{review.overallScore}</div>
                  <div className="text-lg opacity-90">/ 100</div>
                </div>
              </div>
              <div className="w-full bg-white bg-opacity-30 rounded-full h-3 mb-4">
                <div
                  className="bg-white h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${review.overallScore}%` }}
                />
              </div>
              <p className="text-lg opacity-90">
                {review.overallScore >= 90 ? '素晴らしい！Excellent work!' :
                 review.overallScore >= 75 ? 'Great progress! Keep it up!' :
                 review.overallScore >= 60 ? 'Good effort! Room for improvement.' :
                 'Keep practicing! You\'re on the right path.'}
              </p>
            </div>

            {/* Strengths */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="text-green-600" size={28} />
                <h3 className="text-2xl font-bold text-gray-800">Strengths</h3>
              </div>
              <ul className="space-y-3">
                {review.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-green-500 text-xl mt-0.5">✓</span>
                    <span className="text-gray-700 text-lg">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-orange-600" size={28} />
                <h3 className="text-2xl font-bold text-gray-800">Areas for Improvement</h3>
              </div>
              <ul className="space-y-3">
                {review.areasForImprovement.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-orange-500 text-xl mt-0.5">→</span>
                    <span className="text-gray-700 text-lg">{area}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Grammar Points */}
            {review.grammarPoints.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-6">
                  <AlertCircle className="text-purple-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-800">Grammar & Usage</h3>
                </div>
                <div className="space-y-6">
                  {review.grammarPoints.map((point, idx) => (
                    <div key={idx} className="border-l-4 border-purple-500 pl-6">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-red-600 mb-2">❌ Your version:</div>
                        <div className="bg-red-50 p-4 rounded-lg text-gray-800 mb-3">
                          {point.mistake}
                        </div>
                        <div className="text-sm font-semibold text-green-600 mb-2">✓ Corrected:</div>
                        <div className="bg-green-50 p-4 rounded-lg text-gray-800">
                          {point.correction}
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm font-semibold text-purple-700 mb-2">💡 Explanation:</div>
                        <p className="text-gray-700">{point.explanation}</p>
                        {point.example && (
                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <div className="text-sm font-semibold text-purple-700 mb-1">Example:</div>
                            <p className="text-gray-700 italic">{point.example}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vocabulary Recommendations */}
            {review.vocabularyRecommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="text-blue-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-800">Vocabulary to Study</h3>
                </div>
                <ul className="space-y-2">
                  {review.vocabularyRecommendations.map((vocab, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-500 font-bold">•</span>
                      <span className="text-gray-700">{vocab}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Style Notes */}
            {review.styleNotes.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-pink-200">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="text-pink-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-800">Conversational Style Tips</h3>
                </div>
                <ul className="space-y-3">
                  {review.styleNotes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-pink-500 text-xl mt-0.5">💬</span>
                      <span className="text-gray-700 text-lg">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl shadow-lg p-6 border-2 border-green-300">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-green-600" size={28} />
                <h3 className="text-2xl font-bold text-gray-800">Recommended Next Steps</h3>
              </div>
              <ul className="space-y-3">
                {review.nextSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-green-600 font-bold text-lg">{idx + 1}.</span>
                    <span className="text-gray-700 text-lg">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={resetView}
                className="flex-1 px-6 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
              >
                Review Another Conversation
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}