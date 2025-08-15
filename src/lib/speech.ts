
export type SupportedLanguage = 'en' | 'es' | 'fr';

export interface VoiceOption {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

export class TextToSpeech {
  private synth: SpeechSynthesis;
  private selectedVoices: Record<SupportedLanguage, SpeechSynthesisVoice | null> = {
    en: null,
    es: null,
    fr: null
  };
  private voicesLoaded = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voiceChangeCallbacks: Array<() => void> = [];
  private voiceLoadPromise: Promise<void> | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.initializeVoices();
  }

  private async initializeVoices() {
    // Create a promise that resolves when voices are loaded
    this.voiceLoadPromise = new Promise<void>((resolve) => {
      const loadVoicesHandler = () => {
        const voices = this.synth.getVoices();
        if (voices.length === 0) return; // Skip if no voices available yet
        
        console.log('Available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));
        
        // Load saved preferences first
        this.loadSavedVoices(voices);
        
        // Auto-select voices for any language that doesn't have a saved preference
        Object.keys(this.selectedVoices).forEach(lang => {
          const language = lang as SupportedLanguage;
          if (!this.selectedVoices[language]) {
            this.selectedVoices[language] = this.findBestVoice(voices, language);
          }
        });
        
        this.voicesLoaded = true;
        this.notifyVoiceChange();
        resolve();
      };

      // Try to load voices immediately
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        loadVoicesHandler();
      } else {
        // Wait for voices to load
        const handleVoicesChanged = () => {
          loadVoicesHandler();
          this.synth.removeEventListener('voiceschanged', handleVoicesChanged);
        };
        this.synth.addEventListener('voiceschanged', handleVoicesChanged);
        
        // Fallback timeout in case voiceschanged never fires
        setTimeout(() => {
          const voices = this.synth.getVoices();
          if (voices.length > 0 && !this.voicesLoaded) {
            loadVoicesHandler();
          }
        }, 1000);
      }
    });

    return this.voiceLoadPromise;
  }

  private findBestVoice(voices: SpeechSynthesisVoice[], languageCode: string): SpeechSynthesisVoice | null {
    const langPrefix = languageCode.toLowerCase();
    
    // Priority order for voice selection
    const priorities = [
      (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith(`${langPrefix}-`) && v.name.toLowerCase().includes('premium'),
      (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith(`${langPrefix}-`) && v.name.toLowerCase().includes('enhanced'),
      (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith(`${langPrefix}-`) && v.name.toLowerCase().includes('natural'),
      (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith(`${langPrefix}-`),
      (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith(langPrefix),
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes(languageCode === 'en' ? 'english' : languageCode === 'es' ? 'spanish' : 'french')
    ];

    for (const priority of priorities) {
      const voice = voices.find(priority);
      if (voice) {
        console.log(`Selected ${languageCode} voice:`, voice.name, voice.lang);
        return voice;
      }
    }

    return voices[0] || null;
  }

  private loadSavedVoices(voices: SpeechSynthesisVoice[]) {
    try {
      const savedVoices = localStorage.getItem('selectedVoices');
      if (savedVoices) {
        const parsed = JSON.parse(savedVoices);
        Object.keys(parsed).forEach(lang => {
          const language = lang as SupportedLanguage;
          const voiceName = parsed[language];
          const voice = voices.find(v => v.name === voiceName);
          if (voice) {
            this.selectedVoices[language] = voice;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load saved voices:', error);
    }
  }

  private saveVoicePreferences() {
    try {
      const voiceNames: Record<string, string> = {};
      Object.keys(this.selectedVoices).forEach(lang => {
        const voice = this.selectedVoices[lang as SupportedLanguage];
        if (voice) {
          voiceNames[lang] = voice.name;
        }
      });
      localStorage.setItem('selectedVoices', JSON.stringify(voiceNames));
    } catch (error) {
      console.error('Failed to save voice preferences:', error);
    }
  }

  private notifyVoiceChange() {
    this.voiceChangeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Voice change callback error:', error);
      }
    });
  }

  onVoiceChange(callback: () => void) {
    this.voiceChangeCallbacks.push(callback);
    return () => {
      const index = this.voiceChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.voiceChangeCallbacks.splice(index, 1);
      }
    };
  }

  async speak(text: string, lang: SupportedLanguage = 'en') {
    if (!this.synth) return;

    // Ensure voices are loaded before speaking
    if (!this.voicesLoaded && this.voiceLoadPromise) {
      await this.voiceLoadPromise;
    }

    // Stop any currently speaking utterance
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    
    // Language-specific settings
    const langSettings = {
      en: { rate: 0.9, pitch: 1.0, lang: 'en-US' },
      es: { rate: 0.8, pitch: 1.1, lang: 'es-ES' },
      fr: { rate: 0.8, pitch: 1.1, lang: 'fr-FR' }
    };

    const settings = langSettings[lang];
    utterance.lang = settings.lang;
    utterance.rate = text.length > 20 ? settings.rate - 0.1 : settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = 0.9;
    
    // Ensure we have a voice for this language
    const selectedVoice = this.selectedVoices[lang];
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      this.currentUtterance = null;
    };

    utterance.onstart = () => {
      console.log(`Started speaking (${lang}):`, text);
    };

    utterance.onend = () => {
      this.currentUtterance = null;
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  async getAvailableVoicesForLanguage(languageCode: SupportedLanguage): Promise<VoiceOption[]> {
    // Ensure voices are loaded
    if (!this.voicesLoaded && this.voiceLoadPromise) {
      await this.voiceLoadPromise;
    }
    
    const voices = this.synth.getVoices();
    const langPrefix = languageCode.toLowerCase();
    
    return voices
      .filter(voice => 
        voice.lang.toLowerCase().startsWith(`${langPrefix}-`) || 
        voice.lang.toLowerCase().startsWith(langPrefix) ||
        voice.name.toLowerCase().includes(languageCode === 'en' ? 'english' : languageCode === 'es' ? 'spanish' : 'french')
      )
      .map(voice => ({
        name: voice.name,
        lang: voice.lang,
        voice: voice
      }));
  }

  async setVoiceForLanguage(languageCode: SupportedLanguage, voiceName: string) {
    // Ensure voices are loaded
    if (!this.voicesLoaded && this.voiceLoadPromise) {
      await this.voiceLoadPromise;
    }
    
    const voices = this.synth.getVoices();
    const selectedVoice = voices.find(voice => voice.name === voiceName);
    if (selectedVoice) {
      this.selectedVoices[languageCode] = selectedVoice;
      this.saveVoicePreferences();
      this.notifyVoiceChange();
      console.log(`Voice for ${languageCode} changed to:`, selectedVoice.name);
    }
  }

  getCurrentVoice(languageCode: SupportedLanguage): SpeechSynthesisVoice | null {
    return this.selectedVoices[languageCode];
  }

  isVoicesLoaded(): boolean {
    return this.voicesLoaded;
  }

  // Method to wait for voices to be loaded
  async waitForVoices(): Promise<void> {
    if (this.voiceLoadPromise) {
      await this.voiceLoadPromise;
    }
  }
}

export const tts = new TextToSpeech();
