// File: src/app/(dashboard)/conversation/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { supabase } from '@/lib/supabaseClient'
import * as backend from '@/lib/backend'
import { generateResponse } from '@/lib/gemini'
import { Message, Conversation } from '@/types'
import { Send, MessageSquare, FolderOpen, X } from 'lucide-react'
import MessageBubble from '@/components/MessageBubble'
import VoiceRecorder from '@/components/VoiceRecorder'

export default function ConversationPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  
  // Load conversations modal
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [savedConversations, setSavedConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  
  const { user } = useAuth()
  const { transcript, toggleRecording, isRecording } = useSpeechRecognition()
  const { speak, isSpeaking } = useTextToSpeech()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (transcript) {
      setInput(transcript)
    }
  }, [transcript])

  const loadSavedConversations = async () => {
    if (!user) return
    
    setLoadingConversations(true)
    const { data } = await backend.getConversations(user.id, 20, 'free')
    if (data) {
      setSavedConversations(data)
    }
    setLoadingConversations(false)
  }

  const openLoadModal = () => {
    setShowLoadModal(true)
    loadSavedConversations()
  }

  const closeLoadModal = () => {
    setShowLoadModal(false)
  }

  const loadConversation = (conversation: Conversation) => {
    setMessages(conversation.messages)
    setCurrentConversationId(conversation.id)
    closeLoadModal()
  }

  const startNewConversation = () => {
    if (messages.length > 0 && !confirm('Start a new conversation? Current messages will be cleared.')) {
      return
    }
    setMessages([])
    setCurrentConversationId(null)
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await generateResponse(newMessages)
      const aiMessage: Message = { role: 'assistant', content: response }
      setMessages([...newMessages, aiMessage])
    } catch (error) {
      console.error('Error generating response:', error)
      alert('Failed to generate response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const saveConversation = async () => {
    if (isSaving) return
    
    if (!user) {
      alert('Please log in to save conversations')
      return
    }
    
    if (messages.length === 0) {
      alert('No messages to save')
      return
    }

    setIsSaving(true)
    
    try {
      // If we're editing an existing conversation, update it
      if (currentConversationId) {
        const { data, error } = await backend.upsertConversation(
          user.id,
          currentConversationId,
          messages,
          'free'
        )
        
        if (error) throw error
        alert('Conversation updated! ✓')
      } else {
        // Save as new conversation
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            messages,
            type: 'free',
          })
          .select()
          .single()

        if (error) throw error
        
        // Set the conversation ID so subsequent saves update instead of creating new
        if (data) {
          setCurrentConversationId(data.id)
        }
        
        alert('Conversation saved! ✓')
      }
    } catch (error) {
      console.error('Error saving conversation:', error)
      alert('Failed to save conversation. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Free Conversation</h2>
          {currentConversationId && (
            <p className="text-xs text-gray-500 mt-1">
              Editing saved conversation
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={openLoadModal}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-2"
          >
            <FolderOpen size={18} />
            Load
          </button>
          <button
            onClick={saveConversation}
            disabled={messages.length === 0 || isSaving}
            className="px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : currentConversationId ? 'Save' : 'Save'}
          </button>
                    {messages.length > 0 && (
            <button
              onClick={startNewConversation}
              className="px-5 py-3   bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              Create New
            </button>
          )}
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Start a conversation in Japanese!</p>
            <p className="text-sm mt-2">Type or use voice input to practice</p>
            <button
              onClick={openLoadModal}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
            >
              <FolderOpen size={20} />
              Load Previous Conversation
            </button>
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            onSpeak={msg.role === 'assistant' ? () => speak(msg.content) : undefined}
            isSpeaking={isSpeaking}
          />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <VoiceRecorder
            isRecording={isRecording}
            onToggle={toggleRecording}
            disabled={isLoading}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message in Japanese..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Load Conversations Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Load Conversation</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select a previous conversation to continue
                </p>
              </div>
              <button
                onClick={closeLoadModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingConversations ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading conversations...</p>
                </div>
              ) : savedConversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={64} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 text-lg mb-2">No saved conversations</p>
                  <p className="text-sm text-gray-400">
                    Start a conversation and save it to see it here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedConversations.map((conversation) => {
                    const userMessages = conversation.messages.filter(m => m.role === 'user')
                    const firstUserMessage = userMessages[0]?.content || 'No messages'
                    const messageCount = conversation.messages.length
                    const date = new Date(conversation.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => loadConversation(conversation)}
                        className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-md transition text-left"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-gray-800 font-medium line-clamp-2">
                              {firstUserMessage}
                            </p>
                          </div>
                          <span className="ml-4 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                            {messageCount} messages
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{date}</span>
                          <span>•</span>
                          <span>{userMessages.length} exchanges</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeLoadModal}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}