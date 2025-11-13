'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as backend from '@/lib/backend'
import { Plus, Edit2, Trash2, Eye, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface Deck {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  flashcards?: { count: number }[]
}

interface Card {
  id: string
  deck_id: string
  front: string
  back: string
  created_at: string
  updated_at: string
}

export default function FlashcardsPage() {
  const { user } = useAuth()
  const [view, setView] = useState<'decks' | 'cards' | 'study'>('decks')
  const [decks, setDecks] = useState<Deck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  
  // Deck modal
  const [showDeckModal, setShowDeckModal] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [deckDescription, setDeckDescription] = useState('')
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  
  // Card modal
  const [showCardModal, setShowCardModal] = useState(false)
  const [cardFront, setCardFront] = useState('')
  const [cardBack, setCardBack] = useState('')
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  
  // Study mode
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    if (user) {
      loadDecks()
    }
  }, [user])

  const loadDecks = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await backend.getDecks(user.id)
    if (data) {
      setDecks(data)
    }
    setLoading(false)
  }

  const loadCards = async (deck: Deck) => {
    if (!user) return
    const { data } = await backend.getCards(user.id, deck.id)
    if (data) {
      setCards(data)
      setSelectedDeck(deck)
      setView('cards')
    }
  }

  const handleCreateDeck = async () => {
    if (!user || !deckName.trim()) return
    
    const { data, error } = await backend.createDeck(user.id, deckName, deckDescription)
    if (data) {
      await loadDecks()
      closeDeckModal()
    } else {
      alert('Failed to create deck')
    }
  }

  const handleUpdateDeck = async () => {
    if (!user || !editingDeck || !deckName.trim()) return
    
    const { data } = await backend.updateDeck(user.id, editingDeck.id, {
      name: deckName,
      description: deckDescription
    })
    
    if (data) {
      await loadDecks()
      closeDeckModal()
    } else {
      alert('Failed to update deck')
    }
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (!user || !confirm('Delete this deck and all its cards?')) return
    
    const { error } = await backend.deleteDeck(user.id, deckId)
    if (!error) {
      await loadDecks()
    } else {
      alert('Failed to delete deck')
    }
  }

  const handleCreateCard = async () => {
    if (!user || !selectedDeck || !cardFront.trim() || !cardBack.trim()) return
    
    const { data } = await backend.createCard(user.id, selectedDeck.id, cardFront, cardBack)
    if (data) {
      await loadCards(selectedDeck)
      closeCardModal()
    } else {
      alert('Failed to create card')
    }
  }

  const handleUpdateCard = async () => {
    if (!user || !editingCard || !cardFront.trim() || !cardBack.trim()) return
    
    const { data } = await backend.updateCard(user.id, editingCard.id, {
      front: cardFront,
      back: cardBack
    })
    
    if (data && selectedDeck) {
      await loadCards(selectedDeck)
      closeCardModal()
    } else {
      alert('Failed to update card')
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!user || !selectedDeck || !confirm('Delete this card?')) return
    
    const { error } = await backend.deleteCard(user.id, cardId)
    if (!error) {
      await loadCards(selectedDeck)
    } else {
      alert('Failed to delete card')
    }
  }

  const openDeckModal = (deck?: Deck) => {
    if (deck) {
      setEditingDeck(deck)
      setDeckName(deck.name)
      setDeckDescription(deck.description)
    } else {
      setEditingDeck(null)
      setDeckName('')
      setDeckDescription('')
    }
    setShowDeckModal(true)
  }

  const closeDeckModal = () => {
    setShowDeckModal(false)
    setEditingDeck(null)
    setDeckName('')
    setDeckDescription('')
  }

  const openCardModal = (card?: Card) => {
    if (card) {
      setEditingCard(card)
      setCardFront(card.front)
      setCardBack(card.back)
    } else {
      setEditingCard(null)
      setCardFront('')
      setCardBack('')
    }
    setShowCardModal(true)
  }

  const closeCardModal = () => {
    setShowCardModal(false)
    setEditingCard(null)
    setCardFront('')
    setCardBack('')
  }

  const startStudy = () => {
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setView('study')
  }

  const nextCard = () => {
    setShowAnswer(false)
    setCurrentCardIndex((prev) => (prev + 1) % cards.length)
  }

  const prevCard = () => {
    setShowAnswer(false)
    setCurrentCardIndex((prev) => (prev - 1 + cards.length) % cards.length)
  }

  // Deck List View
  if (view === 'decks') {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Flashcard Decks</h1>
              <p className="text-gray-600 mt-1">Create and study flashcard decks</p>
            </div>
            <button
              onClick={() => openDeckModal()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              <Plus size={20} />
              New Deck
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No decks yet. Create your first deck!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{deck.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{deck.description || 'No description'}</p>
                  <div className="text-sm text-gray-500 mb-4">
                    {deck.flashcards?.[0]?.count || 0} cards
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadCards(deck)}
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition text-sm flex items-center justify-center gap-1"
                    >
                      <Eye size={16} />
                      View
                    </button>
                    <button
                      onClick={() => openDeckModal(deck)}
                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteDeck(deck.id)}
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

        {/* Deck Modal */}
        {showDeckModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {editingDeck ? 'Edit Deck' : 'New Deck'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deck Name
                  </label>
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    placeholder="e.g., JLPT N5 Vocabulary"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={deckDescription}
                    onChange={(e) => setDeckDescription(e.target.value)}
                    placeholder="What's this deck for?"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={editingDeck ? handleUpdateDeck : handleCreateDeck}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                  >
                    {editingDeck ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={closeDeckModal}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Cards View
  if (view === 'cards' && selectedDeck) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <button
                onClick={() => setView('decks')}
                className="text-purple-600 hover:text-purple-700 mb-2 flex items-center gap-1"
              >
                ← Back to Decks
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{selectedDeck.name}</h1>
              <p className="text-gray-600 mt-1">{cards.length} cards</p>
            </div>
            <div className="flex gap-2">
              {cards.length > 0 && (
                <button
                  onClick={startStudy}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  Study
                </button>
              )}
              <button
                onClick={() => openCardModal()}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <Plus size={20} />
                Add Card
              </button>
            </div>
          </div>

          {cards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No cards yet. Add your first card!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-purple-600 mb-2">FRONT</div>
                    <div className="text-gray-800">{card.front}</div>
                  </div>
                  <div className="mb-4 pt-4 border-t border-gray-200">
                    <div className="text-xs font-semibold text-pink-600 mb-2">BACK</div>
                    <div className="text-gray-800">{card.back}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openCardModal(card)}
                      className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-sm flex items-center justify-center gap-1"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition text-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Modal */}
        {showCardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {editingCard ? 'Edit Card' : 'New Card'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Front (Question/Prompt)
                  </label>
                  <textarea
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    placeholder="e.g., こんにちは"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Back (Answer)
                  </label>
                  <textarea
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    placeholder="e.g., Hello / Good afternoon"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={editingCard ? handleUpdateCard : handleCreateCard}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                  >
                    {editingCard ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={closeCardModal}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Study Mode
  if (view === 'study' && cards.length > 0) {
    const currentCard = cards[currentCardIndex]

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-2xl w-full">
          <div className="mb-6 flex justify-between items-center">
            <button
              onClick={() => setView('cards')}
              className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              ← Exit Study Mode
            </button>
            <div className="text-gray-600">
              {currentCardIndex + 1} / {cards.length}
            </div>
          </div>

          <div
            className="bg-white rounded-2xl shadow-2xl p-12 min-h-[400px] flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {!showAnswer ? (
              <div className="text-center">
                <div className="text-sm font-semibold text-purple-600 mb-4">QUESTION</div>
                <div className="text-3xl text-gray-800 whitespace-pre-wrap">
                  {currentCard.front}
                </div>
                <div className="mt-8 text-sm text-gray-500">Click to reveal answer</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-sm font-semibold text-pink-600 mb-4">ANSWER</div>
                <div className="text-3xl text-gray-800 whitespace-pre-wrap">
                  {currentCard.back}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={prevCard}
              className="bg-white text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 shadow-md"
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <button
              onClick={nextCard}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 shadow-md"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}