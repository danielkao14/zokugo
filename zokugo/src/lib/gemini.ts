import { GoogleGenerativeAI } from '@google/generative-ai'
import { Message } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)

export async function generateResponse(messages: Message[], systemPrompt?: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  
  const chatHistory = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))

  if (chatHistory.length != 0 ) {
    chatHistory[0].role = 'user'
  }

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

export async function generateScenario(scenarioType: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

  const chat = model.startChat({
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.7,
    },
  })

  const prompt = "You are role playing as a member in a '" + scenarioType + "' for Japanese language practice. Use only Japanese unless otherwise instructed. First, provide a brief introduction of the scenario for the user to set the scene. Then, start off with the first dialogue. The dialogue should jump right into the role play, providing a way to engage the user. For example, a restuarant waiter scenario would immediately greet the customer as the first dialogue. Keep your responses concise and engaging."
  const result = await chat.sendMessage(prompt)
  const response = await result.response
  return response.text()
}