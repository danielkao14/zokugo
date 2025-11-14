// File: src/app/(dashboard)/storyboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as backend from '@/lib/backend'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { BookOpen, Sparkles, Save, Trash2, Eye, RefreshCw, Plus, X, Check } from 'lucide-react'

interface VocabItem {
  word: string
  reading: string
  definition: string
  selected?: boolean
}

interface Story {
  id: string
  user_id: string
  level: string
  title: string
  content: string
  vocabulary: VocabItem[]
  created_at: string
}

interface Deck {
  id: string
  name: string
}

const JLPT_LEVELS = [
  { id: 'N5', name: 'N5 - Beginner', description: 'Basic vocabulary and grammar' },
  { id: 'N4', name: 'N4 - Elementary', description: 'Simple everyday topics' },
  { id: 'N3', name: 'N3 - Intermediate', description: 'Everyday situations with some complexity' },
  { id: 'N2', name: 'N2 - Upper Intermediate', description: 'News and abstract topics' },
  { id: 'N1', name: 'N1 - Advanced', description: 'Complex and abstract content' },
]

export default function StoryboardPage() {
  const { user } = useAuth()
  const [view, setView] = useState<'generate' | 'saved'>('generate')
  const [selectedLevel, setSelectedLevel] = useState('N5')
  const [generatedStory, setGeneratedStory] = useState<{ title: string; content: string; vocabulary: VocabItem[] } | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Flashcard integration
  const [decks, setDecks] = useState<Deck[]>([])
  const [isSelectingVocab, setIsSelectingVocab] = useState(false)
  const [selectedDeckId, setSelectedDeckId] = useState<string>('')
  const [addingToFlashcards, setAddingToFlashcards] = useState(false)

  useEffect(() => {
    if (user) {
      loadSavedStories()
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

  const loadSavedStories = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await backend.getStories(user.id)
    if (data) {
      setSavedStories(data)
    }
    setLoading(false)
  }

  const generateStory = async () => {
    if (!user) return
    
    setGenerating(true)
    setGeneratedStory(null)

    try {
      const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
      const genAI = new GoogleGenerativeAI(API_KEY)

      const levelDescriptions = {
        N5: 'Use only hiragana, katakana, and about 100 basic kanji. Use present tense. Keep sentences very short and simple.',
        N4: 'Use basic kanji (300 characters). Use simple grammar patterns. Keep vocabulary everyday and practical.',
        N3: 'Use intermediate kanji (600 characters). Include some complex sentences. Use a mix of formal and casual language.',
        N2: 'Use advanced kanji (1000 characters). Include abstract concepts. Use varied sentence structures and transitions.',
        N1: 'Use sophisticated kanji and vocabulary. Include idioms and nuanced expressions. Write with literary quality.'
      }

      const systemInstruction = `You are a Japanese language teacher creating reading comprehension materials. 
Create an engaging short story in Japanese at JLPT ${selectedLevel} level.

${levelDescriptions[selectedLevel as keyof typeof levelDescriptions]}

Format your response EXACTLY as:
TITLE: [Story title in Japanese]
---
[Story content in Japanese, 200-400 characters]
---
Vocabulary:
- word (reading) : definition
- word (reading) : definition
...

Make the story interesting and culturally relevant. Include 5-10 vocabulary items that are key to understanding the story.
For the vocabulary section, format each line as: word (reading) : definition
Example: 公園 (こうえん) : Park`

      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        systemInstruction 
      })

      const response = await model.generateContent(
        `Generate a ${selectedLevel} level Japanese reading passage about a random interesting topic.`
      )

      if (response && response.response) {
        const text = response.response.text()
        const sections = text.split('---')
        
        const titleMatch = sections[0].match(/TITLE:\s*(.+)/)
        const title = titleMatch ? titleMatch[1].trim() : `${selectedLevel} Reading`
        const content = sections[1]?.trim() || ''
        
        // Parse vocabulary
        const vocabSection = sections[2]?.trim() || ''
        const vocabulary: VocabItem[] = []
        
        if (vocabSection) {
          const vocabLines = vocabSection.split('\n').filter(line => line.includes(':'))
          vocabLines.forEach(line => {
            const cleanLine = line.replace(/^[-•]\s*/, '').trim()
            const [wordPart, definition] = cleanLine.split(':').map(s => s.trim())
            
            if (wordPart && definition) {
              const readingMatch = wordPart.match(/(.+?)\s*\((.+?)\)/)
              if (readingMatch) {
                vocabulary.push({
                  word: readingMatch[1].trim(),
                  reading: readingMatch[2].trim(),
                  definition: definition,
                  selected: true
                })
              } else {
                vocabulary.push({
                  word: wordPart,
                  reading: '',
                  definition: definition,
                  selected: true
                })
              }
            }
          })
        }

        setGeneratedStory({ title, content, vocabulary })
      }
    } catch (error) {
      console.error('Error generating story:', error)
      alert('Failed to generate story. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const toggleVocabSelection = (index: number) => {
    if (!generatedStory) return
    const newVocab = [...generatedStory.vocabulary]
    newVocab[index].selected = !newVocab[index].selected
    setGeneratedStory({ ...generatedStory, vocabulary: newVocab })
  }

  const addVocabToFlashcards = async () => {
    if (!user || !generatedStory || !selectedDeckId) return

    setAddingToFlashcards(true)
    try {
      const selectedVocab = generatedStory.vocabulary.filter(v => v.selected)
      
      for (const vocab of selectedVocab) {
        const front = vocab.word
        const back = `${vocab.reading}\n\n${vocab.definition}`
        
        await backend.createCard(user.id, selectedDeckId, front, back)
      }

      alert(`Added ${selectedVocab.length} words to flashcards! ✓`)
      setIsSelectingVocab(false)
      
      // Reset all selections
      const resetVocab = generatedStory.vocabulary.map(v => ({ ...v, selected: true }))
      setGeneratedStory({ ...generatedStory, vocabulary: resetVocab })
    } catch (error) {
      console.error('Error adding to flashcards:', error)
      alert('Failed to add vocabulary to flashcards')
    } finally {
      setAddingToFlashcards(false)
    }
  }

  const saveStory = async () => {
    if (!user || !generatedStory) return

    setSaving(true)
    try {
      const { data, error } = await backend.createStory(
        user.id,
        selectedLevel,
        generatedStory.title,
        generatedStory.content,
        generatedStory.vocabulary
      )

      if (error) throw error
      
      alert('Story saved! ✓')
      await loadSavedStories()
      setView('saved')
    } catch (error) {
      console.error('Error saving story:', error)
      alert('Failed to save story')
    } finally {
      setSaving(false)
    }
  }

  const deleteStory = async (storyId: string) => {
    if (!user || !confirm('Delete this story?')) return

    const { error } = await backend.deleteStory(user.id, storyId)
    if (!error) {
      await loadSavedStories()
      if (selectedStory?.id === storyId) {
        setSelectedStory(null)
      }
    } else {
      alert('Failed to delete story')
    }
  }

  // Generate View
  if (view === 'generate') {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="text-center pt-8 pb-4">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">📖 Storyboard</h1>
            <p className="text-gray-600">Practice reading comprehension with AI-generated stories</p>
          </div>

          {/* Navigation */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setView('generate')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium"
            >
              Generate Story
            </button>
            <button
              onClick={() => setView('saved')}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Saved Stories ({savedStories.length})
            </button>
          </div>

          {/* Level Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Select Reading Level</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {JLPT_LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedLevel === level.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="font-bold text-lg mb-1">{level.id}</div>
                  <div className="text-xs text-gray-600">{level.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={generateStory}
              disabled={generating}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto shadow-lg"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Generating Story...
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  Generate {selectedLevel} Story
                </>
              )}
            </button>
          </div>

          {/* Generated Story Display */}
          {generatedStory && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Story Content - 2/3 width */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8 border-2 border-purple-200">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-3">
                      {selectedLevel}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">{generatedStory.title}</h2>
                  </div>
                  <button
                    onClick={saveStory}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Story
                      </>
                    )}
                  </button>
                </div>

                <div className="prose prose-lg max-w-none">
                  <p className="text-xl leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {generatedStory.content}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={generateStory}
                    disabled={generating}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Generate Another
                  </button>
                </div>
              </div>

              {/* Vocabulary List - 1/3 width */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-pink-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Vocabulary</h3>
                  
                  {!isSelectingVocab ? (
                    <button
                      onClick={() => setIsSelectingVocab(true)}
                      disabled={decks.length === 0}
                      className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                      Add to Flashcards
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsSelectingVocab(false)
                          const resetVocab = generatedStory.vocabulary.map(v => ({ ...v, selected: true }))
                          setGeneratedStory({ ...generatedStory, vocabulary: resetVocab })
                        }}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addVocabToFlashcards}
                        disabled={addingToFlashcards || !generatedStory.vocabulary.some(v => v.selected)}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        {addingToFlashcards ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          <Check size={14} />
                        )}
                        Add to Deck
                      </button>
                    </div>
                  )}
                </div>

                {/* Deck Selection */}
                {isSelectingVocab && decks.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Select Deck
                    </label>
                    <select
                      value={selectedDeckId}
                      onChange={(e) => setSelectedDeckId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                    >
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* No Decks Warning */}
                {decks.length === 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    Create a flashcard deck to save vocabulary
                  </div>
                )}

                {/* Vocabulary Items */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {generatedStory.vocabulary.map((vocab, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition ${
                        isSelectingVocab
                          ? vocab.selected
                            ? 'border-purple-300 bg-purple-50 cursor-pointer'
                            : 'border-gray-200 bg-gray-50 opacity-50 cursor-pointer'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      onClick={() => isSelectingVocab && toggleVocabSelection(index)}
                    >
                      {isSelectingVocab && (
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={vocab.selected}
                            onChange={() => toggleVocabSelection(index)}
                            className="mr-2 w-4 h-4 text-purple-600"
                          />
                        </div>
                      )}
                      <div className="font-bold text-gray-800 mb-1">{vocab.word}</div>
                      {vocab.reading && (
                        <div className="text-sm text-gray-500 mb-1">{vocab.reading}</div>
                      )}
                      <div className="text-sm text-gray-700">{vocab.definition}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!generatedStory && !generating && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-dashed border-gray-300">
              <BookOpen size={64} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg">
                Select a level and click "Generate Story" to begin
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Saved Stories View
  if (view === 'saved') {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="text-center pt-8 pb-4">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">📚 Saved Stories</h1>
            <p className="text-gray-600">Review your saved reading passages</p>
          </div>

          {/* Navigation */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setView('generate')}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Generate Story
            </button>
            <button
              onClick={() => setView('saved')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium"
            >
              Saved Stories ({savedStories.length})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : selectedStory ? (
            // Story Detail View with Vocabulary
            <div>
              <button
                onClick={() => setSelectedStory(null)}
                className="text-purple-600 hover:text-purple-700 mb-4"
              >
                ← Back to list
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Story Content */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8 border-2 border-purple-200">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-3">
                        {selectedStory.level}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedStory.title}</h2>
                      <p className="text-sm text-gray-500 mt-2">
                        Saved on {new Date(selectedStory.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteStory(selectedStory.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  </div>

                  <div className="prose prose-lg max-w-none">
                    <p className="text-xl leading-relaxed text-gray-800 whitespace-pre-wrap">
                      {selectedStory.content}
                    </p>
                  </div>
                </div>

                {/* Vocabulary List */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-pink-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Vocabulary</h3>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {selectedStory.vocabulary?.map((vocab, index) => (
                      <div key={index} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <div className="font-bold text-gray-800 mb-1">{vocab.word}</div>
                        {vocab.reading && (
                          <div className="text-sm text-gray-500 mb-1">{vocab.reading}</div>
                        )}
                        <div className="text-sm text-gray-700">{vocab.definition}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : savedStories.length === 0 ? (
            // Empty State
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-dashed border-gray-300">
              <BookOpen size={64} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg mb-4">No saved stories yet</p>
              <button
                onClick={() => setView('generate')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Generate Your First Story
              </button>
            </div>
          ) : (
            // Story List
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedStories.map((story) => (
                <div
                  key={story.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold mb-3">
                    {story.level}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                    {story.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {story.content}
                  </p>
                  <div className="text-xs text-gray-500 mb-4">
                    {story.vocabulary?.length || 0} vocab words • {new Date(story.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedStory(story)}
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition text-sm flex items-center justify-center gap-1"
                    >
                      <Eye size={16} />
                      Read
                    </button>
                    <button
                      onClick={() => deleteStory(story.id)}
                      className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}