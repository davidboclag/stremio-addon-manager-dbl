import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly STORAGE_KEY = 'selected-language';
  private readonly DEFAULT_LANGUAGE = 'en';

  private readonly languages: Language[] = [
    { code: 'en', name: 'LANGUAGE.ENGLISH', flag: '🇺🇸' },
    { code: 'es', name: 'LANGUAGE.SPANISH', flag: '🇪🇸' }
  ];

  private currentLanguage = this.DEFAULT_LANGUAGE;

  constructor(private translate: TranslateService) {
    this.initializeLanguage();
  }

  /**
   * Initialize the language service
   */
  private initializeLanguage(): void {
    this.translate.addLangs(this.languages.map(lang => lang.code));
    this.translate.setDefaultLang(this.DEFAULT_LANGUAGE);

    const savedLanguage = this.getSavedLanguage();
    const browserLanguage = this.getBrowserLanguage();
    this.setLanguage(savedLanguage || browserLanguage || this.DEFAULT_LANGUAGE);
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): Language[] {
    return [...this.languages];
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  setLanguage(languageCode: string): void {
    if (this.isLanguageSupported(languageCode)) {
      this.currentLanguage = languageCode;
      this.translate.use(languageCode);
      this.saveLanguage(languageCode);
    }
  }

  getCurrentLanguageObject(): Language | undefined {
    return this.languages.find(lang => lang.code === this.currentLanguage);
  }

  private isLanguageSupported(languageCode: string): boolean {
    return this.languages.some(lang => lang.code === languageCode);
  }

  private getSavedLanguage(): string | null {
    return localStorage?.getItem(this.STORAGE_KEY) || null;
  }

  private saveLanguage(languageCode: string): void {
    localStorage?.setItem(this.STORAGE_KEY, languageCode);
  }

  private getBrowserLanguage(): string | null {
    const browserLang = navigator?.language?.split('-')[0];
    return browserLang && this.isLanguageSupported(browserLang) ? browserLang : null;
  }
}