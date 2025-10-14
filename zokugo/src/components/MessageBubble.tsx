'use client'

import { Message } from '@/types'
import { Play, Square } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  onSpeak?: () => void
  isSpeaking?: boolean
}

export default function MessageBubble({ message, onSpeak, isSpeaking }: MessageBubbleProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-md ${
        message.role === 'user' 
          ? 'bg-purple-600 text-white' 
          : 'bg-gray-200 text-gray-800'
        } rounded-2xl px-4 py-3`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.role === 'assistant' && onSpeak && (
          <button
            onClick={onSpeak}
            className="mt-2 text-xs flex items-center gap-1 opacity-70 hover:opacity-100 transition"
          >
            {isSpeaking ? <Square size={12} /> : <Play size={12} />}
            {isSpeaking ? 'Stop' : 'Listen'}
          </button>
        )}
      </div>
    </div>
  )
}