// File: src/lib/backend.ts
import { supabase } from '@/lib/supabaseClient'
import { User, Message, Conversation } from '@/types'

/**
 * Profile Management
 */

/**
 * Create a new profile for a user (typically on first sign in)
 * @param userId - The authenticated user's ID
 * @param email - User's email address
 * @param name - Optional display name
 */
export async function createProfile(userId: string, email: string, name?: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: name || email.split('@')[0], // Default name from email
        bio: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating profile:', error)
    return { data: null, error }
  }
}

/**
 * Get a user's profile
 * @param userId - The authenticated user's ID
 */
export async function getProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()  // Returns null if no profile exists instead of throwing error

    // Only throw on actual errors, not "not found"
    if (error && error.code !== 'PGRST116') throw error
    
    return { data, error: null }
  } catch (error) {
    console.error('Error getting profile:', error)
    return { data: null, error }
  }
}

/**
 * Update user profile information
 * @param userId - The authenticated user's ID
 * @param updates - Object containing profile fields to update
 */
export async function editProfile(
  userId: string, 
  updates: { 
    name?: string
    bio?: string
    avatar_url?: string
  }
) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { data: null, error }
  }
}

/**
 * Conversation Management
 */

/**
 * Insert a new conversation
 * @param userId - The authenticated user's ID
 * @param messages - Array of conversation messages
 * @param type - Type of conversation ('free', 'restaurant', 'interview', etc.)
 */
export async function insertConversation(
  userId: string,
  messages: Message[],
  type: string
) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        messages: messages,
        type: type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error inserting conversation:', error)
    return { data: null, error }
  }
}

/**
 * Upsert a conversation (insert if new, update if exists)
 * Useful for continuing/updating an existing conversation
 * @param userId - The authenticated user's ID
 * @param conversationId - ID of existing conversation (null for new)
 * @param messages - Updated array of conversation messages
 * @param type - Type of conversation
 */
export async function upsertConversation(
  userId: string,
  conversationId: string | null,
  messages: Message[],
  type: string
) {
  try {
    // If conversationId exists, update existing conversation
    if (conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          messages: messages,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', userId) // Security: ensure user owns this conversation
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } 
    // Otherwise, insert new conversation
    else {
      return await insertConversation(userId, messages, type)
    }
  } catch (error) {
    console.error('Error upserting conversation:', error)
    return { data: null, error }
  }
}

/**
 * Get a single conversation by ID
 * @param userId - The authenticated user's ID
 * @param conversationId - ID of the conversation to retrieve
 */
export async function getConversation(userId: string, conversationId: string) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId) // Security: ensure user owns this conversation
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting conversation:', error)
    return { data: null, error }
  }
}

/**
 * Get all conversations for a user
 * @param userId - The authenticated user's ID
 * @param limit - Optional limit on number of results
 * @param type - Optional filter by conversation type
 */
export async function getConversations(
  userId: string,
  limit?: number,
  type?: string
) {
  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting conversations:', error)
    return { data: null, error }
  }
}

/**
 * Delete a conversation
 * @param userId - The authenticated user's ID
 * @param conversationId - ID of the conversation to delete
 */
export async function deleteConversation(userId: string, conversationId: string) {
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId) // Security: ensure user owns this conversation

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return { error }
  }
}

/**
 * Statistics and Analytics
 */

/**
 * Get conversation statistics for a user
 * @param userId - The authenticated user's ID
 */
export async function getConversationStats(userId: string) {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    if (!conversations || conversations.length === 0) {
      return {
        data: {
          totalConversations: 0,
          totalMessages: 0,
          conversationsByType: {},
          lastActivity: null
        },
        error: null
      }
    }

    // Calculate total messages
    const totalMessages = conversations.reduce(
      (sum, conv) => sum + conv.messages.filter((m: Message) => m.role === 'user').length,
      0
    )

    // Count conversations by type
    const conversationsByType: { [key: string]: number } = {}
    conversations.forEach(conv => {
      conversationsByType[conv.type] = (conversationsByType[conv.type] || 0) + 1
    })

    // Get most recent activity
    const sortedByDate = [...conversations].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return {
      data: {
        totalConversations: conversations.length,
        totalMessages,
        conversationsByType,
        lastActivity: sortedByDate[0].created_at
      },
      error: null
    }
  } catch (error) {
    console.error('Error getting conversation stats:', error)
    return { data: null, error }
  }
}

/**
 * Flashcard Deck Management
 */

/**
 * Create a new flashcard deck
 * @param userId - The authenticated user's ID
 * @param name - Name of the deck
 * @param description - Optional description of the deck
 */
export async function createDeck(
  userId: string,
  name: string,
  description?: string
) {
  try {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .insert({
        user_id: userId,
        name,
        description: description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating deck:', error)
    return { data: null, error }
  }
}

/**
 * Get all decks for a user
 * @param userId - The authenticated user's ID
 */
export async function getDecks(userId: string) {
  try {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .select('*, flashcards(count)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting decks:', error)
    return { data: null, error }
  }
}

/**
 * Get a single deck with all its cards
 * @param userId - The authenticated user's ID
 * @param deckId - ID of the deck
 */
export async function getDeck(userId: string, deckId: string) {
  try {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .select('*, flashcards(*)')
      .eq('id', deckId)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting deck:', error)
    return { data: null, error }
  }
}

/**
 * Update a deck
 * @param userId - The authenticated user's ID
 * @param deckId - ID of the deck to update
 * @param updates - Object with name and/or description
 */
export async function updateDeck(
  userId: string,
  deckId: string,
  updates: {
    name?: string
    description?: string
  }
) {
  try {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', deckId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating deck:', error)
    return { data: null, error }
  }
}

/**
 * Delete a deck and all its cards
 * @param userId - The authenticated user's ID
 * @param deckId - ID of the deck to delete
 */
export async function deleteDeck(userId: string, deckId: string) {
  try {
    const { error } = await supabase
      .from('flashcard_decks')
      .delete()
      .eq('id', deckId)
      .eq('user_id', userId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting deck:', error)
    return { error }
  }
}

/**
 * Flashcard Management
 */

/**
 * Create a new flashcard in a deck
 * @param userId - The authenticated user's ID
 * @param deckId - ID of the deck
 * @param front - Front of the card (question/prompt)
 * @param back - Back of the card (answer)
 */
export async function createCard(
  userId: string,
  deckId: string,
  front: string,
  back: string
) {
  try {
    // Verify deck ownership
    const { data: deck } = await supabase
      .from('flashcard_decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', userId)
      .single()

    if (!deck) {
      throw new Error('Deck not found or unauthorized')
    }

    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        deck_id: deckId,
        front,
        back,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Update deck's updated_at timestamp
    await supabase
      .from('flashcard_decks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', deckId)

    return { data, error: null }
  } catch (error) {
    console.error('Error creating card:', error)
    return { data: null, error }
  }
}

/**
 * Get all cards in a deck
 * @param userId - The authenticated user's ID
 * @param deckId - ID of the deck
 */
export async function getCards(userId: string, deckId: string) {
  try {
    // Verify deck ownership
    const { data: deck } = await supabase
      .from('flashcard_decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', userId)
      .single()

    if (!deck) {
      throw new Error('Deck not found or unauthorized')
    }

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting cards:', error)
    return { data: null, error }
  }
}

/**
 * Update a flashcard
 * @param userId - The authenticated user's ID
 * @param cardId - ID of the card to update
 * @param updates - Object with front and/or back
 */
export async function updateCard(
  userId: string,
  cardId: string,
  updates: {
    front?: string
    back?: string
  }
) {
  try {
    // Get card to verify deck ownership
    const { data: card } = await supabase
      .from('flashcards')
      .select('deck_id, flashcard_decks(user_id)')
      .eq('id', cardId)
      .single()

    if (!card || (card as any).flashcard_decks?.user_id !== userId) {
      throw new Error('Card not found or unauthorized')
    }

    const { data, error } = await supabase
      .from('flashcards')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single()

    if (error) throw error

    // Update deck's updated_at timestamp
    await supabase
      .from('flashcard_decks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', card.deck_id)

    return { data, error: null }
  } catch (error) {
    console.error('Error updating card:', error)
    return { data: null, error }
  }
}

/**
 * Delete a flashcard
 * @param userId - The authenticated user's ID
 * @param cardId - ID of the card to delete
 */
export async function deleteCard(userId: string, cardId: string) {
  try {
    // Get card to verify deck ownership
    const { data: card } = await supabase
      .from('flashcards')
      .select('deck_id, flashcard_decks(user_id)')
      .eq('id', cardId)
      .single()

    if (!card || (card as any).flashcard_decks?.user_id !== userId) {
      throw new Error('Card not found or unauthorized')
    }

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', cardId)

    if (error) throw error

    // Update deck's updated_at timestamp
    await supabase
      .from('flashcard_decks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', card.deck_id)

    return { error: null }
  } catch (error) {
    console.error('Error deleting card:', error)
    return { error }
  }
}

/**
 * Story/Reading Comprehension Management
 */

/**
 * Create a new story
 * @param userId - The authenticated user's ID
 * @param level - JLPT level (N1-N5)
 * @param title - Story title
 * @param content - Story content in Japanese
 * @param vocabulary - Array of vocabulary items
 */
export async function createStory(
  userId: string,
  level: string,
  title: string,
  content: string,
  vocabulary: Array<{ word: string; reading: string; definition: string }>
) {
  try {
    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        level,
        title,
        content,
        vocabulary,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating story:', error)
    return { data: null, error }
  }
}

/**
 * Get all stories for a user
 * @param userId - The authenticated user's ID
 * @param level - Optional filter by JLPT level
 */
export async function getStories(userId: string, level?: string) {
  try {
    let query = supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (level) {
      query = query.eq('level', level)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting stories:', error)
    return { data: null, error }
  }
}

/**
 * Get a single story
 * @param userId - The authenticated user's ID
 * @param storyId - ID of the story
 */
export async function getStory(userId: string, storyId: string) {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting story:', error)
    return { data: null, error }
  }
}

/**
 * Delete a story
 * @param userId - The authenticated user's ID
 * @param storyId - ID of the story to delete
 */
export async function deleteStory(userId: string, storyId: string) {
  try {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', userId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting story:', error)
    return { error }
  }
}

/**
 * Conversation Review & Feedback
 */

/**
 * Generate AI-powered conversation review
 * @param messages - Array of conversation messages
 */
export async function generateConversationReview(messages: Message[]) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
    const genAI = new GoogleGenerativeAI(API_KEY)

    const systemInstruction = `You are an expert Japanese language teacher providing detailed feedback on student conversations. 

Analyze the conversation and provide a comprehensive review in the following JSON format:
{
  "overallScore": 85,
  "strengths": ["Good use of polite forms", "Natural conversation flow"],
  "areasForImprovement": ["Particle usage needs work", "Limited vocabulary range"],
  "grammarPoints": [
    {
      "mistake": "私は学校に行きましたか？",
      "correction": "私は学校に行きました。",
      "explanation": "You used the question form か with a statement. Remove か when making statements.",
      "example": "彼は昨日来ました。(He came yesterday.)"
    }
  ],
  "vocabularyRecommendations": ["Learn more time expressions", "Study weather vocabulary"],
  "styleNotes": ["Try using more casual expressions with friends", "Good job matching formality levels"],
  "nextSteps": ["Practice particle は vs が", "Study JLPT N4 grammar patterns", "Read more native content"]
}

Focus on:
1. Grammar mistakes with specific examples from their conversation
2. Vocabulary gaps and recommendations
3. Conversational style improvements to sound more natural
4. Concrete next steps for improvement

Be encouraging but honest. Provide 3-5 items in each category. Make corrections specific to their actual mistakes.`

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      systemInstruction 
    })

    // Format conversation for analysis
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
      .join('\n\n')

    const prompt = `Analyze this Japanese conversation and provide detailed feedback:\n\n${conversationText}\n\nProvide your response in JSON format as specified.`

    const response = await model.generateContent(prompt)
    const text = response.response.text()

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim()
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim()
    }

    const review = JSON.parse(jsonText)

    return { data: review, error: null }
  } catch (error) {
    console.error('Error generating review:', error)
    return { data: null, error }
  }
}

/**
 * Helper function to check if profile exists, create if not
 * Call this after user signs in/up
 * @param userId - The authenticated user's ID
 * @param email - User's email address
 */
export async function ensureProfileExists(userId: string, email: string) {
  try {
    const { data: existingProfile } = await getProfile(userId)
    
    if (!existingProfile) {
      return await createProfile(userId, email)
    }
    
    return { data: existingProfile, error: null }
  } catch (error) {
    console.error('Error ensuring profile exists:', error)
    return { data: null, error }
  }
}