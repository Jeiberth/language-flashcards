import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

export interface Flashcard {
  id: string;
  french: string;
  english: string;
  nextReviewDate: Date;
  interval: number; // In days for review cards, in minutes for learning cards
  ease: number;
  createdAt: Date;
  reviewCount: number;
  // New Anki-style properties
  cardState: 'new' | 'learning' | 'review' | 'relearning';
  currentLearningStep: number; // Current position in learning steps array
  lapses: number; // Number of times card has been forgotten
}

export interface StudyStats {
  totalCards: number;
  reviewedToday: number;
  currentStreak: number;
  dueToday: number;
  masteryPercentage: number;
  lastStudyDate?: Date;
}

// Anki-style learning configuration
export interface LearningConfig {
  learningSteps: number[]; // Steps in minutes, e.g., [1, 10, 30]
  relearningSteps: number[]; // Steps for relearning, e.g., [10]
  graduatingInterval: number; // Days for first review after learning (default: 1)
  easyInterval: number; // Days for easy button in learning (default: 4)
  newCardsPerDay: number; // Limit for new cards per day
}

const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  learningSteps: [1, 10, 30], // 1 min, 10 min, 30 min
  relearningSteps: [10], // 10 min
  graduatingInterval: 1, // 1 day
  easyInterval: 4, // 4 days
  newCardsPerDay: 20
};

const DB_NAME = 'FlashcardsDB';
const DB_VERSION = 2; // Increment version for schema changes
const CARDS_STORE = 'flashcards';
const STATS_STORE = 'stats';
const CONFIG_STORE = 'config';

let db: IDBPDatabase;

export async function initDB() {
  if (!db) {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(CARDS_STORE)) {
          const cardStore = db.createObjectStore(CARDS_STORE, { keyPath: 'id' });
          cardStore.createIndex('nextReviewDate', 'nextReviewDate');
          cardStore.createIndex('cardState', 'cardState');
        }
        if (!db.objectStoreNames.contains(STATS_STORE)) {
          db.createObjectStore(STATS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CONFIG_STORE)) {
          db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
        }

        // Migrate existing cards if upgrading from version 1
        if (oldVersion === 1) {
          // Use setTimeout to avoid transaction conflict
          setTimeout(async () => {
            try {
              const transaction = db.transaction([CARDS_STORE], 'readwrite');
              const store = transaction.objectStore(CARDS_STORE);
              
              const allCards = await store.getAll();
              for (const card of allCards) {
                // Add new properties to existing cards
                card.cardState = card.reviewCount === 0 ? 'new' : 'review';
                card.currentLearningStep = 0;
                card.lapses = 0;
                await store.put(card);
              }
              await transaction.done;
            } catch (error) {
              console.error('Migration error:', error);
            }
          }, 0);
        }
      },
    });

    // Initialize default config if not exists
    try {
      const existingConfig = await db.get(CONFIG_STORE, 'learning');
      if (!existingConfig) {
        await db.put(CONFIG_STORE, { key: 'learning', value: DEFAULT_LEARNING_CONFIG });
      }
    } catch (error) {
      console.error('Failed to initialize config:', error);
    }
  }
  return db;
}

export async function getLearningConfig(): Promise<LearningConfig> {
  await initDB();
  const config = await db.get(CONFIG_STORE, 'learning');
  return config ? config.value : DEFAULT_LEARNING_CONFIG;
}

export async function updateLearningConfig(config: LearningConfig): Promise<void> {
  await initDB();
  await db.put(CONFIG_STORE, { key: 'learning', value: config });
}

export async function addFlashcard(french: string, english: string): Promise<Flashcard> {
  await initDB();
  const card: Flashcard = {
    id: uuidv4(),
    french,
    english,
    nextReviewDate: new Date(), // New cards are immediately available
    interval: 0, // Will be set based on learning steps
    ease: 2.5,
    createdAt: new Date(),
    reviewCount: 0,
    cardState: 'new',
    currentLearningStep: 0,
    lapses: 0,
  };
  
  await db.add(CARDS_STORE, card);
  return card;
}

// Alias for addFlashcard to match component expectations
export const addCard = addFlashcard;

export async function getAllFlashcards(): Promise<Flashcard[]> {
  await initDB();
  return await db.getAll(CARDS_STORE);
}

// Alias for getAllFlashcards to match component expectations
export const getAllCards = getAllFlashcards;

export async function getDueFlashcards(): Promise<Flashcard[]> {
  await initDB();
  const now = new Date();
  const allCards = await db.getAll(CARDS_STORE);
  
  // Get all cards that are due for review (including learning, relearning, and review states)
  const dueCards = allCards.filter(card => {
    const reviewDate = new Date(card.nextReviewDate);
    return reviewDate <= now;
  });
  
  console.log('Due cards analysis:', {
    total: allCards.length,
    due: dueCards.length,
    breakdown: {
      new: dueCards.filter(c => c.cardState === 'new').length,
      learning: dueCards.filter(c => c.cardState === 'learning').length,
      relearning: dueCards.filter(c => c.cardState === 'relearning').length,
      review: dueCards.filter(c => c.cardState === 'review').length
    }
  });
  
  return dueCards;
}

// Alias for getDueFlashcards to match component expectations
export const getDueCards = getDueFlashcards;

export async function updateFlashcard(card: Flashcard): Promise<void> {
  await initDB();
  await db.put(CARDS_STORE, card);
}

export async function updateCard(id: string, french: string, english: string): Promise<void> {
  await initDB();
  const existingCard = await db.get(CARDS_STORE, id);
  if (existingCard) {
    const updatedCard = { ...existingCard, french, english };
    await db.put(CARDS_STORE, updatedCard);
  }
}

export async function deleteFlashcard(id: string): Promise<void> {
  await initDB();
  await db.delete(CARDS_STORE, id);
}

// Alias for deleteFlashcard to match component expectations
export const deleteCard = deleteFlashcard;

export async function updateCardReview(id: string, difficulty: 'again' | 'hard' | 'good' | 'easy'): Promise<void> {
  await initDB();
  const card = await db.get(CARDS_STORE, id);
  if (!card) return;

  const config = await getLearningConfig();
  const updatedCard = await calculateAnkiScheduling(card, difficulty, config);
  await db.put(CARDS_STORE, updatedCard);
}

async function calculateAnkiScheduling(
  card: Flashcard, 
  difficulty: 'again' | 'hard' | 'good' | 'easy',
  config: LearningConfig
): Promise<Flashcard> {
  const now = new Date();
  let updatedCard = { ...card };

  if (card.cardState === 'new' || card.cardState === 'learning') {
    // Handle learning phase
    const learningSteps = config.learningSteps;
    
    switch (difficulty) {
      case 'again':
        // Reset to first learning step
        updatedCard.currentLearningStep = 0;
        updatedCard.cardState = 'learning';
        updatedCard.interval = learningSteps[0];
        updatedCard.nextReviewDate = addMinutes(now, learningSteps[0]);
        break;
        
      case 'hard':
        // Repeat current step
        const currentStep = Math.max(0, card.currentLearningStep);
        updatedCard.interval = learningSteps[currentStep] || learningSteps[learningSteps.length - 1];
        updatedCard.nextReviewDate = addMinutes(now, updatedCard.interval);
        break;
        
      case 'good':
        // Advance to next learning step or graduate
        const nextStepIndex = card.currentLearningStep + 1;
        if (nextStepIndex >= learningSteps.length) {
          // Graduate to review
          updatedCard.cardState = 'review';
          updatedCard.interval = config.graduatingInterval;
          updatedCard.nextReviewDate = addDays(now, config.graduatingInterval);
          updatedCard.currentLearningStep = 0;
        } else {
          // Move to next learning step
          updatedCard.currentLearningStep = nextStepIndex;
          updatedCard.cardState = 'learning';
          updatedCard.interval = learningSteps[nextStepIndex];
          updatedCard.nextReviewDate = addMinutes(now, learningSteps[nextStepIndex]);
        }
        break;
        
      case 'easy':
        // Graduate with easy interval
        updatedCard.cardState = 'review';
        updatedCard.interval = config.easyInterval;
        updatedCard.nextReviewDate = addDays(now, config.easyInterval);
        updatedCard.currentLearningStep = 0;
        updatedCard.ease = Math.min(updatedCard.ease + 0.15, 5.0);
        break;
    }
  } else if (card.cardState === 'review' || card.cardState === 'relearning') {
    // Handle review phase with traditional SM-2 algorithm
    const { newInterval, newEase } = calculateSM2Review(card.interval, card.ease, difficulty);
    
    if (difficulty === 'again') {
      // Move to relearning
      updatedCard.cardState = 'relearning';
      updatedCard.currentLearningStep = 0;
      updatedCard.lapses += 1;
      updatedCard.interval = config.relearningSteps[0];
      updatedCard.nextReviewDate = addMinutes(now, config.relearningSteps[0]);
      updatedCard.ease = Math.max(1.3, card.ease - 0.2);
    } else {
      // Continue in review phase
      updatedCard.cardState = 'review';
      updatedCard.interval = newInterval;
      updatedCard.ease = newEase;
      updatedCard.nextReviewDate = addDays(now, newInterval);
    }
  }

  updatedCard.reviewCount += 1;
  return updatedCard;
}

function calculateSM2Review(interval: number, ease: number, difficulty: 'again' | 'hard' | 'good' | 'easy'): { newInterval: number; newEase: number } {
  let newEase = ease;
  let newInterval = interval;

  switch (difficulty) {
    case 'hard':
      newInterval = Math.max(1, interval * 1.2);
      newEase = Math.max(1.3, ease - 0.15);
      break;
    case 'good':
      newInterval = interval * ease;
      break;
    case 'easy':
      newInterval = interval * ease * 1.3;
      newEase = ease + 0.15;
      break;
  }

  return { newInterval: Math.max(1, newInterval), newEase };
}

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function searchFlashcards(query: string): Promise<Flashcard[]> {
  const allCards = await getAllFlashcards();
  return allCards.filter(card => 
    card.french.toLowerCase().includes(query.toLowerCase()) ||
    card.english.toLowerCase().includes(query.toLowerCase())
  );
}

// Deprecated - use calculateAnkiScheduling instead
export function calculateNextReview(interval: number, ease: number, difficulty: 'again' | 'hard' | 'good' | 'easy'): { newInterval: number; newEase: number } {
  return calculateSM2Review(interval, ease, difficulty);
}

export async function getStudyStats(): Promise<StudyStats> {
  const allCards = await getAllFlashcards();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const dueCards = allCards.filter(card => new Date(card.nextReviewDate) <= now);
  const reviewedToday = allCards.filter(card => {
    const reviewDate = new Date(card.nextReviewDate);
    return reviewDate >= today && card.reviewCount > 0;
  });
  
  const reviewCards = allCards.filter(card => card.cardState === 'review');
  const masteryPercentage = allCards.length > 0 ? (reviewCards.length / allCards.length) * 100 : 0;

  return {
    totalCards: allCards.length,
    reviewedToday: reviewedToday.length,
    currentStreak: 0, // Simplified for now
    dueToday: dueCards.length,
    masteryPercentage: Math.round(masteryPercentage),
  };
}

export async function exportData(): Promise<string> {
  const cards = await getAllFlashcards();
  const config = await getLearningConfig();
  return JSON.stringify({ cards, config }, null, 2);
}

export async function importData(jsonData: string): Promise<number> {
  try {
    const data = JSON.parse(jsonData);
    const cards: Flashcard[] = data.cards || data; // Support both new and old format
    let importedCount = 0;
    
    // Import config if available
    if (data.config) {
      await updateLearningConfig(data.config);
    }
    
    for (const card of cards) {
      if (card.french && card.english) {
        await db.put(CARDS_STORE, {
          ...card,
          id: card.id || uuidv4(),
          nextReviewDate: new Date(card.nextReviewDate || new Date()),
          interval: card.interval || 0,
          ease: card.ease || 2.5,
          createdAt: new Date(card.createdAt || new Date()),
          reviewCount: card.reviewCount || 0,
          cardState: card.cardState || 'new',
          currentLearningStep: card.currentLearningStep || 0,
          lapses: card.lapses || 0,
        });
        importedCount++;
      }
    }
    
    return importedCount;
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

export async function clearAllData(): Promise<void> {
  const tx = db.transaction([CARDS_STORE], 'readwrite');
  await tx.objectStore(CARDS_STORE).clear();
  await tx.done;
}
