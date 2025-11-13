'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { supabase } from '@/lib/supabaseClient'
import { generateResponse } from '@/lib/gemini'
import { Message } from '@/types'
import { Send, MessageSquare } from 'lucide-react'
import { systemPrompt } from '@/lib/utils'
import MessageBubble from '@/components/MessageBubble'
import VoiceRecorder from '@/components/VoiceRecorder'

export default function ConversationPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await generateResponse(newMessages, systemPrompt)
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
    if (!user || messages.length === 0) return

    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          messages,
          scenario: 'free',
        })

      if (error) {
        console.log('Error saving conversation:', error)
        throw error}
      alert('Conversation saved!')
    } catch (error) {
      console.error('Error saving conversation:', error)
      alert('Failed to save conversation')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Free Conversation</h2>
        <button
          onClick={saveConversation}
          disabled={messages.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Conversation
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Start a conversation in Japanese!</p>
            <p> Need help? Try asking for conversation starters 😀</p>;
            <p className="text-sm mt-2">Type or use voice input to practice</p>
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
    </div>
  )
}