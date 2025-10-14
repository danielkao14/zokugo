'use client'

import { Mic } from 'lucide-react'

interface VoiceRecorderProps {
  isRecording: boolean
  onToggle: () => void
  disabled?: boolean
}

export default function VoiceRecorder({ isRecording, onToggle, disabled }: VoiceRecorderProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`p-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
        isRecording
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      <Mic size={20} />
    </button>
  )
}