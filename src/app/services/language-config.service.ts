import { Injectable } from '@angular/core';
import { LANGUAGES, Language } from './preferences.service';

@Injectable({ providedIn: 'root' })
export class LanguageConfigService {
  getConfig(language?: Language) {
    return LANGUAGES[language || 'spanish'];
  }
}
