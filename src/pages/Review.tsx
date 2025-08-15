import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Volume2, RotateCcw, CheckCircle, Clock, Calendar } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDueCards, getAllCards, updateCardReview, Flashcard, getLearningConfig } from '@/lib/database';
import { tts } from '@/lib/speech';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';

const Review = () => {
  const { refreshStats } = useApp();
  const { t } = useI18n();
  const { speak, practiceLanguage } = useVoiceSettings();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionType, setSessionType] = useState<'due' | 'all'>('due');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDueCards();
  }, []);

  // Start dynamic due card checking when we have cards
  useEffect(() => {
    if (cards.length > 0) {
      startDynamicDueCardChecking();
    } else {
      stopDynamicDueCardChecking();
    }

    // Cleanup on unmount
    return () => {
      stopDynamicDueCardChecking();
    };
  }, [cards.length, sessionType]);

  // Auto-play audio when card changes
  useEffect(() => {
    if (cards.length > 0 && !showAnswer) {
      // Small delay to ensure the card is displayed
      const timer = setTimeout(() => {
        speakFrench();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, cards, showAnswer]);

  const startDynamicDueCardChecking = () => {
    // Check for newly due cards every 30 seconds during active session
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(async () => {
      await checkForNewlyDueCards();
    }, 30000); // Check every 30 seconds
  };

  const stopDynamicDueCardChecking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkForNewlyDueCards = async () => {
    try {
      const now = new Date();
      let allCurrentCards: Flashcard[];
      
      if (sessionType === 'due') {
        // In due-only mode, check for newly due cards
        allCurrentCards = await getDueCards();
      } else {
        // In all-cards mode, get all cards and prioritize
        const allCards = await getAllCards();
        allCurrentCards = prioritizeCards(allCards);
      }

      // Get IDs of cards currently in our session
      const currentCardIds = new Set(cards.map(card => card.id));
      
      // Find newly due cards that are not already in our current session
      const newlyDueCards = allCurrentCards.filter(card => {
        const isNewlyDue = !currentCardIds.has(card.id);
        const reviewDate = new Date(card.nextReviewDate);
        const isDue = reviewDate <= now;
        return isNewlyDue && isDue;
      });

      if (newlyDueCards.length > 0) {
        console.log('Found newly due cards during session:', {
          newlyDue: newlyDueCards.length,
          cards: newlyDueCards.map(c => ({ id: c.id, state: c.cardState, nextReview: c.nextReviewDate }))
        });

        // Insert newly due cards at the beginning of the remaining cards
        const currentCard = cards[currentIndex];
        const remainingCards = cards.slice(currentIndex + 1);
        
        // Prioritize the newly due cards
        const prioritizedNewlyDue = prioritizeCards(newlyDueCards);
        
        // Rebuild the card array: current card + newly due cards + remaining cards
        const updatedCards = [
          currentCard,
          ...prioritizedNewlyDue,
          ...remainingCards
        ];

        setCards(updatedCards);
        
        console.log('Updated session with newly due cards:', {
          before: cards.length,
          after: updatedCards.length,
          newlyAdded: newlyDueCards.length
        });
      }
    } catch (error) {
      console.error('Failed to check for newly due cards:', error);
    }
  };

  const loadDueCards = async () => {
    try {
      const dueCards = await getDueCards();
      console.log('Loading due cards:', dueCards.length);
      setCards(dueCards);
      setCurrentIndex(0);
      setShowAnswer(false);
      setSessionType('due');
    } catch (error) {
      console.error('Failed to load due cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllCards = async () => {
    try {
      const allCards = await getAllCards();
      // Prioritize due cards even in "all cards" mode
      const prioritizedCards = prioritizeCards(allCards);
      console.log('Loading all cards with prioritization:', {
        total: allCards.length,
        prioritized: prioritizedCards.length,
        breakdown: getPrioritizationBreakdown(prioritizedCards)
      });
      setCards(prioritizedCards);
      setCurrentIndex(0);
      setShowAnswer(false);
      setSessionType('all');
    } catch (error) {
      console.error('Failed to load all cards:', error);
    }
  };

  // Enhanced prioritization with strict due card priority
  const prioritizeCards = (allCards: Flashcard[]) => {
    const now = new Date();
    
    // Separate cards into categories with detailed logging
    const dueCards = allCards.filter(card => {
      const reviewDate = new Date(card.nextReviewDate);
      const isDue = reviewDate <= now;
      return isDue;
    });
    
    const newCards = allCards.filter(card => {
      const reviewDate = new Date(card.nextReviewDate);
      const isNotDue = reviewDate > now;
      const isNew = card.cardState === 'new';
      return isNotDue && isNew;
    });
    
    const futureCards = allCards.filter(card => {
      const reviewDate = new Date(card.nextReviewDate);
      const isNotDue = reviewDate > now;
      const isNotNew = card.cardState !== 'new';
      return isNotDue && isNotNew;
    });

    // Further prioritize due cards by urgency (learning/relearning first, then review)
    const urgentDueCards = dueCards.filter(card => 
      card.cardState === 'learning' || card.cardState === 'relearning'
    );
    
    const regularDueCards = dueCards.filter(card => 
      card.cardState === 'review' || card.cardState === 'new'
    );

    const prioritizedOrder = [...urgentDueCards, ...regularDueCards, ...newCards, ...futureCards];
    
    console.log('Card prioritization:', {
      urgentDue: urgentDueCards.length,
      regularDue: regularDueCards.length,
      new: newCards.length,
      future: futureCards.length,
      total: prioritizedOrder.length
    });

    return prioritizedOrder;
  };

  const getPrioritizationBreakdown = (cards: Flashcard[]) => {
    const now = new Date();
    return {
      due: cards.filter(card => new Date(card.nextReviewDate) <= now).length,
      new: cards.filter(card => card.cardState === 'new' && new Date(card.nextReviewDate) > now).length,
      future: cards.filter(card => card.cardState !== 'new' && new Date(card.nextReviewDate) > now).length
    };
  };

  // Dynamically re-prioritize remaining cards after each review
  const reprioritizeRemainingCards = async (remainingCards: Flashcard[]) => {
    if (sessionType === 'due') {
      // In due-only mode, still need to prioritize by urgency
      return prioritizeCards(remainingCards);
    }

    // In "all cards" mode, we need to dynamically prioritize
    // Get fresh card data to check for newly due cards
    try {
      const allCurrentCards = await getAllCards();
      
      // Find cards that are still in our remaining set
      const remainingIds = new Set(remainingCards.map(card => card.id));
      const currentRemainingCards = allCurrentCards.filter(card => remainingIds.has(card.id));
      
      // Re-prioritize the remaining cards
      const reprioritized = prioritizeCards(currentRemainingCards);
      
      console.log('Reprioritization after review:', {
        remaining: remainingCards.length,
        reprioritized: reprioritized.length,
        breakdown: getPrioritizationBreakdown(reprioritized)
      });
      
      return reprioritized;
    } catch (error) {
      console.error('Failed to reprioritize cards:', error);
      // Fallback to simple prioritization of current remaining cards
      return prioritizeCards(remainingCards);
    }
  };

  const handleAnswer = async (difficulty: 'again' | 'hard' | 'good' | 'easy') => {
    if (cards.length === 0) return;

    const currentCard = cards[currentIndex];
    
    try {
      await updateCardReview(currentCard.id, difficulty);
      
      // Remove the current card and get remaining cards
      const remainingCards = cards.filter((_, index) => index !== currentIndex);
      
      if (remainingCards.length === 0) {
        // All cards reviewed - stop dynamic checking
        stopDynamicDueCardChecking();
        await refreshStats();
        setCards([]);
        setCurrentIndex(0);
      } else {
        // Dynamically re-prioritize remaining cards to ensure due cards come first
        const reprioritizedCards = await reprioritizeRemainingCards(remainingCards);
        setCards(reprioritizedCards);
        
        // Adjust current index - if we were not at the last card, stay at same position
        // If we were at the last card, move to the beginning
        const newIndex = currentIndex >= reprioritizedCards.length ? 0 : currentIndex;
        setCurrentIndex(newIndex);
      }
      
      setShowAnswer(false);
    } catch (error) {
      console.error('Failed to update card review:', error);
    }
  };

  const speakFrench = () => {
    if (cards[currentIndex]) {
      // Use the selected practice language instead of hardcoding 'fr'
      speak(cards[currentIndex].french, practiceLanguage);
    }
  };

  const resetSession = () => {
    stopDynamicDueCardChecking();
    if (sessionType === 'due') {
      loadDueCards();
    } else {
      loadAllCards();
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    // Auto-play French audio when answer is shown
    setTimeout(() => {
      speakFrench();
    }, 200);
  };

  const getCardStateInfo = (card: Flashcard) => {
    const isLearning = card.cardState === 'new' || card.cardState === 'learning';
    const isRelearning = card.cardState === 'relearning';
    
    let stateText = '';
    let stateColor = '';
    
    switch (card.cardState) {
      case 'new':
        stateText = 'New';
        stateColor = 'text-blue-600 dark:text-blue-400';
        break;
      case 'learning':
        stateText = `Learning (Step ${card.currentLearningStep + 1})`;
        stateColor = 'text-orange-600 dark:text-orange-400';
        break;
      case 'relearning':
        stateText = 'Relearning';
        stateColor = 'text-red-600 dark:text-red-400';
        break;
      case 'review':
        stateText = 'Review';
        stateColor = 'text-green-600 dark:text-green-400';
        break;
    }

    const intervalText = isLearning || isRelearning 
      ? `${card.interval}m` 
      : `${card.interval}d`;

    return { stateText, stateColor, intervalText, isLearning, isRelearning };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 pt-24 md:pt-28 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center dark:text-white">{t('review.loading')}</div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 pt-24 md:pt-28 pb-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto text-green-600 dark:text-green-400" size={64} />
            <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">
              {sessionType === 'due' ? t('review.all.done') : t('review.no.cards')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {sessionType === 'due' 
                ? t('review.no.due')
                : t('review.no.collection')}
            </p>
            <div className="flex flex-col gap-3 items-center">
              <Button onClick={resetSession} className="mt-4">
                <RotateCcw className="mr-2" size={16} />
                {t('review.check.again')}
              </Button>
              {sessionType === 'due' && (
                <Button onClick={loadAllCards} variant="outline">
                  {t('review.all.cards')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const { stateText, stateColor, intervalText, isLearning, isRelearning } = getCardStateInfo(currentCard);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 pt-24 md:pt-28 pb-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white mb-4">
            <BookOpen size={24} />
          </div>
          <h1 className="text-2xl font-bold dark:text-white">
            {sessionType === 'due' ? t('review.title.due') : t('review.title.all')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('review.subtitle')} {currentIndex + 1} {t('review.subtitle.of')} {cards.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>

        {/* Card State Info */}
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className={`flex items-center gap-1 ${stateColor}`}>
            {isLearning || isRelearning ? <Clock size={16} /> : <Calendar size={16} />}
            <span className="font-medium">{stateText}</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            <span>Interval: {intervalText}</span>
          </div>
          {currentCard.lapses > 0 && (
            <div className="text-red-500 dark:text-red-400">
              <span>Lapses: {currentCard.lapses}</span>
            </div>
          )}
        </div>

        {/* Flashcard */}
        <Card className="min-h-[300px] dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-center dark:text-white">
              {showAnswer ? t('review.card.translation') : t('review.card.french')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-4 dark:text-white">
                {showAnswer ? currentCard.english : currentCard.french}
              </div>
              {!showAnswer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={speakFrench}
                  className="mb-4"
                >
                  <Volume2 className="mr-2" size={16} />
                  {t('review.listen')}
                </Button>
              )}
              {showAnswer && (
                <div className="space-y-3">
                  <div className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                    {currentCard.french}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={speakFrench}
                    className="mb-4"
                  >
                    <Volume2 className="mr-2" size={16} />
                    {t('review.listen')}
                  </Button>
                </div>
              )}
            </div>

            {!showAnswer ? (
              <Button 
                onClick={handleShowAnswer}
                size="lg"
                className="w-full max-w-xs"
              >
                {t('review.show.answer')}
              </Button>
            ) : (
              <div className="w-full space-y-3">
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('review.how.well')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => handleAnswer('again')}
                    className="w-full"
                  >
                    {t('review.answer.again')}
                    <br />
                    <span className="text-xs opacity-75">
                      {isLearning || isRelearning ? '1m' : 'Relearn'}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAnswer('hard')}
                    className="w-full border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900"
                  >
                    {t('review.answer.hard')}
                    <br />
                    <span className="text-xs opacity-75">
                      {isLearning || isRelearning ? `${intervalText}` : `${Math.round(currentCard.interval * 1.2)}d`}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAnswer('good')}
                    className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900"
                  >
                    {t('review.answer.good')}
                    <br />
                    <span className="text-xs opacity-75">
                      {isLearning || isRelearning ? 'Next step' : `${Math.round(currentCard.interval * currentCard.ease)}d`}
                    </span>
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleAnswer('easy')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {t('review.answer.easy')}
                    <br />
                    <span className="text-xs opacity-75">
                      {isLearning || isRelearning ? '4d' : `${Math.round(currentCard.interval * currentCard.ease * 1.3)}d`}
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Review;
