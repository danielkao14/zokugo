import { GoogleGenerativeAI } from '@google/generative-ai'
import { Message } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)

export async function generateResponse(messages: Message[], systemPrompt?: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  
  const chatHistory = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))

  const chat = model.startChat({
    history: chatHistory.slice(0, -1),
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.7,
    },
  })

  const prompt = systemPrompt 
    ? `${systemPrompt}\n\nUser: ${messages[messages.length - 1].content}`
    : messages[messages.length - 1].content

  const result = await chat.sendMessage(prompt)
  const response = await result.response
  return response.text()
}