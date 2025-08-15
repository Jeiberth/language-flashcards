
import React, { createContext, useContext, useEffect, useState } from 'react';
import { initDB, Flashcard, StudyStats, getStudyStats } from '@/lib/database';

interface AppContextType {
  isLoading: boolean;
  stats: StudyStats;
  refreshStats: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StudyStats>({
    totalCards: 0,
    reviewedToday: 0,
    currentStreak: 0,
    dueToday: 0,
    masteryPercentage: 0,
  });

  const refreshStats = async () => {
    try {
      const newStats = await getStudyStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        await refreshStats();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  return (
    <AppContext.Provider value={{ isLoading, stats, refreshStats }}>
      {children}
    </AppContext.Provider>
  );
};
