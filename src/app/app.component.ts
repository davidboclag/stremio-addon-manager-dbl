import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LanguageService, Language } from './services/language.service';
import { StremioService } from './services/stremio.service';
import { DebridService } from './services/debrid.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, CommonModule, TranslateModule],
  template: `
    <div class="min-vh-100 bg-secondary-subtle">
      <nav class="navbar navbar-dark bg-secondary">
        <div class="container">
          <a class="navbar-brand fw-bold d-flex align-items-center">
            <i class="bi bi-puzzle-fill me-2 fs-5"></i>
            Stremio Addon Manager DBL
          </a>
          
          <div class="d-flex align-items-center ms-auto">
            <div class="d-flex flex-row align-items-center gap-2">
              <!-- Language Selector -->
              <div class="dropdown">
                <button
                  class="btn btn-light btn-sm dropdown-toggle d-flex align-items-center"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  [attr.aria-label]="'LANGUAGE.SELECT' | translate"
                >
                  <span class="me-2">{{ currentLanguage?.flag }}</span>
                  <span class="d-none d-md-inline me-2">{{ currentLanguage?.name | translate }}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" role="menu">
                  <li class="dropdown-header">
                    {{ "LANGUAGE.SELECT" | translate }}
                  </li>
                  <li *ngFor="let language of availableLanguages">
                    <button
                      class="dropdown-item d-flex align-items-center"
                      [class.active]="currentLanguage?.code === language.code"
                      (click)="selectLanguage(language)"
                      type="button"
                      role="menuitem"
                      [attr.aria-label]="language.name | translate"
                    >
                      <span class="me-2">{{ language.flag }}</span>
                      <span class="flex-grow-1">{{ language.name | translate }}</span>
                      <i
                        *ngIf="currentLanguage?.code === language.code"
                        class="bi bi-check-circle-fill text-primary ms-2"
                        aria-hidden="true"
                      ></i>
                    </button>
                  </li>
                </ul>
              </div>
              
              <!-- Logout Button -->
              @if (stremio.isAuthenticated()) {
                <button
                  class="btn btn-danger btn-sm d-flex align-items-center"
                  (click)="logout()"
                  type="button"
                  [attr.aria-label]="'DASHBOARD.ARIA.LOGOUT' | translate"
                >
                  <i class="bi bi-box-arrow-right me-1" aria-hidden="true"></i>
                  {{ "NAVIGATION.LOGOUT" | translate }}
                </button>
              }
            </div>
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
  private readonly router = inject(Router);
  readonly stremio = inject(StremioService);
  private readonly debridService = inject(DebridService);

  constructor(private languageService: LanguageService) { }

  /**
   * Cierra la sesión
   */
  logout(): void {
    this.stremio.clearAuth();
    this.debridService.clearToken();
    this.router.navigate(['/']);
  }

  /**
   * Selecciona un idioma
   */
  selectLanguage(language: Language): void {
    this.languageService.setLanguage(language.code);
  }

  /**
   * Obtiene los idiomas disponibles
   */
  get availableLanguages(): Language[] {
    return this.languageService.getAvailableLanguages();
  }

  /**
   * Obtiene el idioma actual
   */
  get currentLanguage(): Language | undefined {
    return this.languageService.getCurrentLanguageObject();
  }
}
