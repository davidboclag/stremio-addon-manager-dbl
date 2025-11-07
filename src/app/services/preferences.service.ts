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
  aiolistsCode?: string;
  aiolistsCodeList?: string;
  subheroCode?: string;
}

// Información sobre compatibilidad de addons por idioma
export const ADDON_LANGUAGE_SUPPORT: Record<string, Language[]> = {
  'Torrentio': ['spanish', 'english', 'french', 'german', 'italian', 'portuguese', 'russian', 'mexican'],
  'Comet': ['spanish', 'english', 'french', 'german', 'italian', 'portuguese', 'russian', 'mexican'],
  'MediaFusion': ['spanish', 'english', 'french', 'german', 'italian', 'portuguese', 'russian', 'mexican'],
  'Peerflix': ['spanish', 'english', 'mexican'], // Solo disponible en español, inglés y mexicano
  'Jackettio': ['spanish', 'english', 'french', 'german', 'italian', 'portuguese', 'russian', 'mexican'],
  'SubHero': ['spanish', 'english', 'french', 'german', 'italian', 'portuguese', 'russian', 'mexican']
};

export const LANGUAGES: Record<Language, LanguageConfig> = {
  spanish: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'LANGUAGE.SPANISH',
    flag: '🇪🇸',
    torrentioCode: 'spanish',
    jackettioCode: 'spanish',
    cometCode: 'es',
    mediafusionPriority: ['Spanish', 'English'],
    peerflixCode: 'es,en',
    aiolistsCode: 'es',
    aiolistsCodeList: 'es-ES',
    subheroCode: 'es'
  },
  english: {
    code: 'en',
    name: 'English',
    nativeName: 'LANGUAGE.ENGLISH',
    flag: '🇺🇸',
    torrentioCode: 'english',
    jackettioCode: 'english',
    cometCode: 'en',
    mediafusionPriority: ['English'],
    peerflixCode: 'en',
    aiolistsCode: 'en',
    aiolistsCodeList: 'en'
  },
  french: {
    code: 'fr',
    name: 'French',
    nativeName: 'LANGUAGE.FRENCH',
    flag: '🇫🇷',
    torrentioCode: 'french',
    jackettioCode: 'french',
    cometCode: 'fr',
    mediafusionPriority: ['French', 'English'],
    aiolistsCode: 'fr',
    aiolistsCodeList: 'fr',
    subheroCode: 'fr'
  },
  german: {
    code: 'de',
    name: 'German',
    nativeName: 'LANGUAGE.GERMAN',
    flag: '🇩🇪',
    torrentioCode: 'german',
    jackettioCode: 'german',
    cometCode: 'de',
    mediafusionPriority: ['German', 'English'],
    aiolistsCode: 'de',
    aiolistsCodeList: 'de',
    subheroCode: 'de'
  },
  italian: {
    code: 'it',
    name: 'Italian',
    nativeName: 'LANGUAGE.ITALIAN',
    flag: '🇮🇹',
    torrentioCode: 'italian',
    jackettioCode: 'italian',
    cometCode: 'it',
    mediafusionPriority: ['Italian', 'English'],
    aiolistsCode: 'it',
    aiolistsCodeList: 'it',
    subheroCode: 'it'
  },
  portuguese: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'LANGUAGE.PORTUGUESE',
    flag: '🇵🇹',
    torrentioCode: 'portuguese',
    jackettioCode: 'portuguese',
    cometCode: 'pt',
    mediafusionPriority: ['Portuguese', 'Spanish', 'English'],
    aiolistsCode: 'pt-BR',
    aiolistsCodeList: 'pt-BR',
    subheroCode: 'pt'
  },
  russian: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'LANGUAGE.RUSSIAN',
    flag: '🇷🇺',
    torrentioCode: 'russian',
    jackettioCode: 'russian',
    cometCode: 'ru',
    mediafusionPriority: ['Russian', 'English'],
    aiolistsCode: 'ru',
    aiolistsCodeList: 'ru',
    subheroCode: 'ru'
  },
  mexican: {
    code: 'mx',
    name: 'Mexican/Latino',
    nativeName: 'LANGUAGE.SPANISH_LATIN',
    flag: '🇲🇽',
    torrentioCode: 'latino',
    jackettioCode: 'spanish',
    cometCode: 'la',
    mediafusionPriority: ['Latino', 'Spanish', 'English'],
    peerflixCode: 'es,en',
    aiolistsCode: 'es',
    aiolistsCodeList: 'es-MX',
    subheroCode: 'es'
  }
};

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly _selectedLanguage = signal<Language>(this.getStoredLanguage());

  readonly selectedLanguage = this._selectedLanguage.asReadonly();

  // Selección de idiomas para SubHero (array de códigos: 'es','en',...)
  private readonly _subheroLanguages = signal<string[]>(this.getStoredSubheroLanguages());
  readonly selectedSubheroLanguages = this._subheroLanguages.asReadonly();

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

  setSubheroLanguages(langs: string[]): void {
    this._subheroLanguages.set(langs);
    try {
      localStorage.setItem('subhero_languages', JSON.stringify(langs));
    } catch (e) {
      // ignore storage errors
      console.error('Error saving subhero languages', e);
    }
  }

  private getStoredLanguage(): Language {
    if (typeof localStorage === 'undefined') return 'spanish';
    const stored = localStorage.getItem('addon_language') as Language;
    return stored && stored in LANGUAGES ? stored : 'spanish';
  }

  private getStoredSubheroLanguages(): string[] {
    if (typeof localStorage === 'undefined') return [this.getStoredLanguageCodeFallback()];
    const raw = localStorage.getItem('subhero_languages');
    if (!raw) return [this.getStoredLanguageCodeFallback()];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(p => typeof p === 'string')) return parsed;
    } catch (e) {
      // fallthrough
    }
    return [this.getStoredLanguageCodeFallback()];
  }

  private getStoredLanguageCodeFallback(): string {
    const lang = this.getStoredLanguage();
    return LANGUAGES[lang].code;
  }
}