import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, Language } from '../../services/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './language-selector.component.html'
})
export class LanguageSelectorComponent {
  isDropdownOpen = false;

  constructor(private languageService: LanguageService) { }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectLanguage(language: Language): void {
    this.languageService.setLanguage(language.code);
    this.isDropdownOpen = false;
  }

  get availableLanguages(): Language[] {
    return this.languageService.getAvailableLanguages();
  }

  get currentLanguage(): Language | undefined {
    return this.languageService.getCurrentLanguageObject();
  }
}