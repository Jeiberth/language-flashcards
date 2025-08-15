import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tts, SupportedLanguage } from '@/lib/speech';

interface VoiceSettings {
  practiceLanguage: SupportedLanguage;
  selectedVoice: string;
}

interface VoiceSettingsContextType {
  practiceLanguage: SupportedLanguage;
  selectedVoice: string;
  setPracticeLanguage: (language: SupportedLanguage) => void;
  setSelectedVoice: (voiceName: string) => void;
  isVoicesLoaded: boolean;
  speak: (text: string, language?: SupportedLanguage) => Promise<void>;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

const VOICE_SETTINGS_KEY = 'voiceSettings';

export const VoiceSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [practiceLanguage, setPracticeLanguageState] = useState<SupportedLanguage>('fr');
  const [selectedVoice, setSelectedVoiceState] = useState<string>('');
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const savedSettings = localStorage.getItem(VOICE_SETTINGS_KEY);
        if (savedSettings) {
          const parsed: VoiceSettings = JSON.parse(savedSettings);
          console.log('Loading saved voice settings:', parsed);
          setPracticeLanguageState(parsed.practiceLanguage);
          setSelectedVoiceState(parsed.selectedVoice);
          
          // Wait for voices to be ready before applying settings
          await tts.waitForVoices();
          
          // Apply the saved voice preference immediately
          if (parsed.selectedVoice && parsed.practiceLanguage) {
            await tts.setVoiceForLanguage(parsed.practiceLanguage, parsed.selectedVoice);
            console.log('Applied saved voice:', parsed.selectedVoice, 'for language:', parsed.practiceLanguage);
          }
        } else {
          // No saved settings, wait for voices and set defaults
          await tts.waitForVoices();
          const voices = await tts.getAvailableVoicesForLanguage('fr');
          if (voices.length > 0) {
            const defaultVoice = voices[0];
            setSelectedVoiceState(defaultVoice.name);
            await tts.setVoiceForLanguage('fr', defaultVoice.name);
            console.log('Set default voice:', defaultVoice.name);
          }
        }
        
        setIsVoicesLoaded(true);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load voice settings:', error);
        setIsVoicesLoaded(true);
        setIsInitialized(true);
      }
    };

    loadSavedSettings();
  }, []);

  // Save settings to localStorage whenever they change (only after initialization)
  useEffect(() => {
    if (isInitialized && practiceLanguage && selectedVoice) {
      const settings: VoiceSettings = {
        practiceLanguage,
        selectedVoice
      };
      
      try {
        localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
        console.log('Saved voice settings:', settings);
      } catch (error) {
        console.error('Failed to save voice settings:', error);
      }
    }
  }, [practiceLanguage, selectedVoice, isInitialized]);

  const setPracticeLanguage = async (language: SupportedLanguage) => {
    console.log('Changing practice language to:', language);
    setPracticeLanguageState(language);
    
    // When language changes, we need to find and set an appropriate voice
    try {
      await tts.waitForVoices();
      const voices = await tts.getAvailableVoicesForLanguage(language);
      
      if (voices.length > 0) {
        const currentVoice = tts.getCurrentVoice(language);
        if (currentVoice) {
          setSelectedVoiceState(currentVoice.name);
          console.log('Using existing voice for', language, ':', currentVoice.name);
        } else {
          // Auto-select the first available voice
          const firstVoice = voices[0];
          setSelectedVoiceState(firstVoice.name);
          await tts.setVoiceForLanguage(language, firstVoice.name);
          console.log('Set new voice for', language, ':', firstVoice.name);
        }
      }
    } catch (error) {
      console.error('Error setting practice language:', error);
    }
  };

  const setSelectedVoice = async (voiceName: string) => {
    console.log('Changing voice to:', voiceName, 'for language:', practiceLanguage);
    try {
      setSelectedVoiceState(voiceName);
      await tts.setVoiceForLanguage(practiceLanguage, voiceName);
      console.log('Successfully set voice:', voiceName);
    } catch (error) {
      console.error('Error setting selected voice:', error);
    }
  };

  const speak = async (text: string, language?: SupportedLanguage) => {
    const languageToUse = language || practiceLanguage;
    console.log('Speaking:', text, 'in language:', languageToUse, 'with voice:', selectedVoice);
    try {
      // Ensure we're using the correct voice for the language
      if (selectedVoice && languageToUse === practiceLanguage) {
        await tts.setVoiceForLanguage(languageToUse, selectedVoice);
      }
      await tts.speak(text, languageToUse);
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  };

  const value: VoiceSettingsContextType = {
    practiceLanguage,
    selectedVoice,
    setPracticeLanguage,
    setSelectedVoice,
    isVoicesLoaded,
    speak
  };

  return (
    <VoiceSettingsContext.Provider value={value}>
      {children}
    </VoiceSettingsContext.Provider>
  );
};

export const useVoiceSettings = (): VoiceSettingsContextType => {
  const context = useContext(VoiceSettingsContext);
  if (!context) {
    throw new Error('useVoiceSettings must be used within a VoiceSettingsProvider');
  }
  return context;
};