import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LanguageSelectorComponent } from './components/language-selector/language-selector.component';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LanguageSelectorComponent],
  template: `
    <div class="min-vh-100 bg-secondary-subtle">
      <nav class="navbar navbar-dark bg-secondary">
        <div class="container">
          <a class="navbar-brand fw-bold d-flex align-items-center" href="#">
            <i class="bi bi-puzzle-fill me-2 fs-5"></i>
            Stremio Addon Manager2
          </a>
          
          <div class="navbar-nav ms-auto">
            <app-language-selector></app-language-selector>
          </div>
        </div>
      </nav>
      
      <main>
        <div class="container py-4">
          <router-outlet></router-outlet>
          <app-toast></app-toast>
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  constructor(private languageService: LanguageService) { }
}
