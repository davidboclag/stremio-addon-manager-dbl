import { Injectable, signal, computed } from '@angular/core';

export type Language = 'spanish' | 'english' | 'french' | 'german' | 'italian' | 'portuguese' | 'russian' | 'mexican';

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  torrentioCode: string;
  cometCode: string;
  mediafusionPriority: string[];
  peerflixCode?: string;
  jackettioCode?: string;
}

// Información sobre compatibilidad de addons por idioma
export const ADDON_LANGUAGE_SUPPORT: Record<string, Language[]> = {
  'Torrentio (RD)': ['spanish', 'english', 'french', 'german', 'italian', 'portuguese', 'russian', 'mexican'],
  'Comet (RD)': ['spanish', 'english', 'french', 'german', 'italian', 'portuguese', 'russian', 'mexican'],
  'MediaFusion (RD)': ['spanish', 'english', 'french', 'german', 'italian', 'portuguese', 'russian', 'mexican'],
  'Peerflix (RD)': ['spanish', 'english'], // Solo disponible en español e inglés
  'Jackettio (RD)': ['spanish', 'english', 'french', 'german', 'italian', 'portuguese', 'russian', 'mexican'],
};

export const LANGUAGES: Record<Language, LanguageConfig> = {
  spanish: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    torrentioCode: 'spanish',
    jackettioCode: 'spanish',
    cometCode: 'es',
    mediafusionPriority: ['Spanish', 'English'],
    peerflixCode: 'es,en'
  },
  english: {
    code: 'en', 
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    torrentioCode: 'english',
    jackettioCode: 'english',
    cometCode: 'en',
    mediafusionPriority: ['English'],
    peerflixCode: 'en'
  },
  french: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    torrentioCode: 'french',
    jackettioCode: 'french',
    cometCode: 'fr',
    mediafusionPriority: ['French', 'English']
  },
  german: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    torrentioCode: 'german',
    jackettioCode: 'german',
    cometCode: 'de',
    mediafusionPriority: ['German', 'English']
  },
  italian: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    torrentioCode: 'italian',
    jackettioCode: 'italian',
    cometCode: 'it',
    mediafusionPriority: ['Italian', 'English']
  },
  portuguese: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    torrentioCode: 'portuguese',
    jackettioCode: 'portuguese',
    cometCode: 'pt',
    mediafusionPriority: ['Portuguese', 'Spanish', 'English']
  },
  russian: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    torrentioCode: 'russian',
    jackettioCode: 'russian',
    cometCode: 'ru',
    mediafusionPriority: ['Russian', 'English']
  },
  mexican: {
    code: 'mx',
    name: 'Mexican/Latino',
    nativeName: 'Español Latino',
    flag: '🇲🇽',
    torrentioCode: 'latino',
    jackettioCode: 'spanish',
    cometCode: 'la',
    mediafusionPriority: ['Latino','Spanish', 'English'],
    peerflixCode: 'es,en'
  }
};

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly _selectedLanguage = signal<Language>(this.getStoredLanguage());
  
  readonly selectedLanguage = this._selectedLanguage.asReadonly();

  // Computed para obtener la configuración del idioma actual
  readonly currentLanguageConfig = computed(() => LANGUAGES[this._selectedLanguage()]);

  // Computed para verificar si un addon está disponible en el idioma seleccionado
  readonly isAddonAvailable = computed(() => (addonName: string) => {
    const supportedLanguages = ADDON_LANGUAGE_SUPPORT[addonName as keyof typeof ADDON_LANGUAGE_SUPPORT];
    return supportedLanguages ? supportedLanguages.includes(this._selectedLanguage()) : true;
  });

  setLanguage(lang: Language): void {
    this._selectedLanguage.set(lang);
    localStorage.setItem('addon_language', lang);
  }

  private getStoredLanguage(): Language {
    if (typeof localStorage === 'undefined') return 'spanish';
    const stored = localStorage.getItem('addon_language') as Language;
    return stored && stored in LANGUAGES ? stored : 'spanish';
  }
}