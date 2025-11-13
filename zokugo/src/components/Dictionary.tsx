// File: src/components/Dictionary.tsx
"use client"

import { GoogleGenerativeAI } from '@google/generative-ai'
import React, { useState, useEffect } from 'react'
import { Search, BookOpen, X, Plus, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import * as backend from '@/lib/backend'

interface DictionaryProps {
  onClose?: () => void
}

interface ParsedResult {
  word: string
  reading: string
  definition: string
  exampleJapanese: string
  exampleEnglish: string
}

interface Deck {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export default function Dictionary({ onClose }: DictionaryProps) {
  const { user } = useAuth()
  const [word, setWord] = useState('')
  const [result, setResult] = useState<ParsedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Flashcard integration
  const [decks, setDecks] = useState<Deck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string>('')
  const [addingToDecks, setAddingToDecks] = useState<Set<string>>(new Set())
  const [addedToDecks, setAddedToDecks] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      loadDecks()
    }
  }, [user])

  const loadDecks = async () => {
    if (!user) return
    const { data } = await backend.getDecks(user.id)
    if (data) {
      setDecks(data)
      if (data.length > 0 && !selectedDeckId) {
        setSelectedDeckId(data[0].id)
      }
    }
  }

  const fetchDefinition = async (searchWord: string) => {
    setLoading(true)
    setError('')
    setResult(null)
    setAddedToDecks(new Set()) // Reset added decks for new search

    try {
      const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
      const genAI = new GoogleGenerativeAI(API_KEY)
      
      const systemInstruction = `You are a Japanese-English dictionary assistant. When given a word or phrase:
1. If it's a Japanese word/phrase: provide the reading (hiragana/katakana/romaji), English definition, a Japanese example sentence, and its English translation
2. If it's an English word: provide the Japanese translation, reading, a Japanese example sentence, and its English translation
3. Format your response with "//" separating sections: reading // definition // japanese_example // english_example
4. Do not include labels like "Reading:", "Definition:", or "Example:" in your response
5. Keep definitions clear and concise for language learners
6. The reading should be in hiragana/katakana for Japanese words, or romaji for pronunciation
7. Always provide both a Japanese example sentence and its English translation`

      const model = await genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        systemInstruction 
      })

      const response = await model.generateContent(searchWord)
      
      if (response && response.response) {
        const generatedText = response.response.text()
        const sections = generatedText.split('//')
        
        if (sections.length >= 4) {
          setResult({
            word: searchWord,
            reading: sections[0]?.trim() || '',
            definition: sections[1]?.trim() || 'No definition found.',
            exampleJapanese: sections[2]?.trim() || '',
            exampleEnglish: sections[3]?.trim() || 'No example available.'
          })
        } else {
          throw new Error('Unexpected response format')
        }
      } else {
        throw new Error('No response received from the model.')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (word.trim()) {
      fetchDefinition(word.trim())
    }
  }

  const addToFlashcards = async () => {
    if (!user || !result || !selectedDeckId || addingToDecks.has(selectedDeckId)) return

    // Mark this deck as being added to
    setAddingToDecks(prev => new Set(prev).add(selectedDeckId))

    try {
      // Front: Kanji/word
      const front = result.word

      // Back: Reading + Definition + Examples
      const back = `${result.reading}

${result.definition}

Example:
${result.exampleJapanese}
${result.exampleEnglish}`

      const { data, error } = await backend.createCard(user.id, selectedDeckId, front, back)
      
      if (error) throw error

      // Mark as successfully added
      setAddedToDecks(prev => new Set(prev).add(selectedDeckId))
      
      // Show success briefly, then remove the "adding" state
      setTimeout(() => {
        setAddingToDecks(prev => {
          const newSet = new Set(prev)
          newSet.delete(selectedDeckId)
          return newSet
        })
      }, 1000)
    } catch (err) {
      console.error('Error adding to flashcards:', err)
      alert('Failed to add to flashcards')
      setAddingToDecks(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedDeckId)
        return newSet
      })
    }
  }

  const isAddedToDeck = (deckId: string) => addedToDecks.has(deckId)
  const isAddingToDeck = (deckId: string) => addingToDecks.has(deckId)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <BookOpen className="text-purple-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Dictionary</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close dictionary"
          >
            <X size={20} className="text-gray-600" />
          </button>
        )}
      </div>

      {/* Search Form */}
      <div className="p-4 border-b border-gray-200">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Enter a word or phrase..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-800"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search size={18} />
            Search
          </button>
        </form>
      </div>

      {/* Results Area */}
      <div className="flex-grow overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600">Looking up "{word}"...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Word Card */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-sm">
              <h3 className="text-4xl font-bold text-gray-800 mb-2">
                {result.word}
              </h3>
              {result.reading && (
                <p className="text-lg text-gray-500 font-light">
                  {result.reading}
                </p>
              )}
            </div>

            {/* No Decks Message */}
            {decks.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">
                  Create a flashcard deck to save words for study
                </p>
              </div>
            )}

            {/* Definition Section - Emphasized */}
            <div className="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                <h4 className="text-sm font-semibold text-purple-600 uppercase tracking-wide">
                  Definition
                </h4>
              </div>
              <p className="text-xl text-gray-800 leading-relaxed font-medium">
                {result.definition}
              </p>
            </div>

            {/* Example Section - Emphasized */}
            <div className="bg-white border-2 border-pink-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-pink-600 rounded-full"></div>
                <h4 className="text-sm font-semibold text-pink-600 uppercase tracking-wide">
                  Example Usage
                </h4>
              </div>
              
              {/* Japanese Example */}
              <div className="mb-4 p-4 bg-pink-50 rounded-lg">
                <p className="text-xl text-gray-800 leading-relaxed font-medium mb-2">
                  {result.exampleJapanese}
                </p>
              </div>
              
              {/* English Translation */}
              <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-pink-400">
                <p className="text-lg text-gray-700 italic leading-relaxed">
                  {result.exampleEnglish}
                </p>
              </div>
            </div>
            {decks.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add to Flashcard Deck
                    </label>
                    <select
                      value={selectedDeckId}
                      onChange={(e) => setSelectedDeckId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-800 text-sm"
                    >
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={addToFlashcards}
                    disabled={!selectedDeckId || isAddingToDeck(selectedDeckId)}
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm font-medium mt-6 ${
                      isAddedToDeck(selectedDeckId)
                        ? 'bg-green-500 text-white'
                        : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isAddingToDeck(selectedDeckId) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Adding...
                      </>
                    ) : isAddedToDeck(selectedDeckId) ? (
                      <>
                        <Check size={16} />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Add Card
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Front: {result.word} | Back: Reading + Definition + Examples
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BookOpen size={64} className="text-gray-300 mb-4" />
            <p className="text-gray-400 text-lg mb-2">
              Search for a word or phrase
            </p>
            <p className="text-gray-400 text-sm">
              Look up Japanese or English words and get definitions with examples
            </p>
          </div>
        )}
      </div>
    </div>
  )
}