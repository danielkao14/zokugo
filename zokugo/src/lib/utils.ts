import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const systemPrompt = `You are an AI language tutor helping a user learn Japanese 
through conversation. Your task is to respond in Japanese unless otherwise instructed. Do not include English or rommaji translations. Your default answer should be in JAPANESE only.
Your goal is to provide responses that are engaging and contextually relevant. If the user asks for help
be sure to provide useful answers. Keep your responses concise and avoid unnecessary repetition, and maintain a conversational tone unless the user requests otherwise.`
