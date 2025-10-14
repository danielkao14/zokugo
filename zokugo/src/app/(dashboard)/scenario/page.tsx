'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { supabase } from '@/lib/supabaseClient'
import { generateResponse } from '@/lib/gemini'
import { scenarios } from '@/lib/scenarios'
import { Message, Scenario } from '@/types'
import { Send } from 'lucide-react'
import MessageBubble from '@/components/MessageBubble'
import VoiceRecorder from '@/components/VoiceRecorder'

export default function ScenarioPage() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
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

  const startScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario)
    setMessages([
      {
        role: 'assistant',
        content: `${scenario.emoji} Welcome! ${scenario.title} scenario started. Let's practice!`
      }
    ])
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !selectedScenario) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await generateResponse(newMessages, selectedScenario.prompt)
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
    if (!user || messages.length === 0 || !selectedScenario) return

    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          messages,
          type: selectedScenario.id,
        })

      if (error) throw error
      alert('Scenario conversation saved!')
    } catch (error) {
      console.error('Error saving conversation:', error)
      alert('Failed to save conversation')
    }
  }

  const resetScenario = () => {
    setSelectedScenario(null)
    setMessages([])
    setInput('')
  }

  // Scenario Selection View
  if (!selectedScenario) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose a Scenario</h2>
            <p className="text-gray-600">
              Select a situation to practice your Japanese conversation skills
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => startScenario(scenario)}
                className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all text-left group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform origin-center inline-block">
                  {scenario.emoji}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {scenario.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {scenario.prompt}
                </p>
                <div className="mt-4 text-purple-600 text-sm font-medium group-hover:underline">
                  Start Practice →
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 p-6 bg-purple-50 rounded-xl">
            <h3 className="font-semibold text-gray-800 mb-2">💡 Tips for Scenario Practice</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Stay in character and respond naturally</li>
              <li>• Use appropriate politeness levels for the situation</li>
              <li>• Practice both speaking and typing for best results</li>
              <li>• Don't be afraid to make mistakes - that's how you learn!</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Conversation View
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={resetScenario}
            className="text-gray-600 hover:text-gray-800 transition"
          >
            ← Back
          </button>
          <span className="text-2xl">{selectedScenario.emoji}</span>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {selectedScenario.title}
            </h2>
            <p className="text-xs text-gray-500">
              {messages.filter(m => m.role === 'user').length} messages sent
            </p>
          </div>
        </div>
        <button
          onClick={saveConversation}
          disabled={messages.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Conversation
        </button>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            onSpeak={msg.role === 'assistant' ? () => speak(msg.content) : undefined}
            isSpeaking={isSpeaking}
          />
        ))}
        
        {/* Loading Indicator */}
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
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Respond to the scenario..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
        
        {/* Helper Text */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          {isRecording ? (
            <span className="text-red-500 font-medium">🎤 Recording...</span>
          ) : (
            <span>Type your response or click the microphone to speak</span>
          )}
        </div>
      </div>
    </div>
  )
}