export interface User {
  id: string
  email: string
  name?: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Conversation {
  id: string
  user_id: string
  messages: Message[]
  type: string
  created_at: string
}

export interface Scenario {
  id: string
  title: string
  emoji: string
  prompt: string
}