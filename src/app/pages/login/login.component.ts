import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StremioService } from '../../services/stremio.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="card shadow mx-auto mt-5" style="max-width:520px">
      <div class="card-body">
        <div class="text-center mb-4">
          <i class="bi bi-shield-lock display-4 text-primary"></i>
          <h4 class="card-title mt-3">{{ "LOGIN.TITLE" | translate }}</h4>
          <p class="text-muted">{{ "LOGIN.DESCRIPTION" | translate }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="mb-3">
            <label class="form-label fw-semibold">{{ "LOGIN.EMAIL" | translate }}</label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-envelope"></i>
              </span>
              <input 
                class="form-control" 
                formControlName="email" 
                type="email" 
                [placeholder]="'LOGIN.EMAIL_PLACEHOLDER' | translate"
                [disabled]="loading()"
                [class.is-invalid]="form.get('email')?.invalid && (form.get('email')?.touched || form.get('email')?.dirty)"
              />
            </div>
            <div *ngIf="form.get('email')?.invalid && (form.get('email')?.touched || form.get('email')?.dirty) && !form.get('authKey')?.value" class="invalid-feedback d-block">
              {{ "LOGIN.EMAIL_REQUIRED" | translate }}
            </div>
            <div *ngIf="form.errors?.['login'] && (form.get('email')?.touched || form.get('password')?.touched || form.get('authKey')?.touched)" class="invalid-feedback d-block">
              {{ form.errors?.['login'] | translate }}
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">{{ "LOGIN.PASSWORD" | translate }}</label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-lock"></i>
              </span>
              <input 
                class="form-control" 
                formControlName="password" 
                type="password" 
                [placeholder]="'LOGIN.PASSWORD_PLACEHOLDER' | translate"
                [disabled]="loading()"
                [class.is-invalid]="form.get('password')?.invalid && (form.get('password')?.touched || form.get('password')?.dirty)"
              />
            </div>
            <div *ngIf="form.get('password')?.invalid && (form.get('password')?.touched || form.get('password')?.dirty) && !form.get('authKey')?.value" class="invalid-feedback d-block">
              {{ "LOGIN.PASSWORD_REQUIRED" | translate }}
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">{{ "LOGIN.AUTH_KEY" | translate }} <small class="text-muted">({{ "LOGIN.OPTIONAL" | translate }})</small></label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-key"></i>
              </span>
              <input 
                class="form-control" 
                formControlName="authKey" 
                [placeholder]="'LOGIN.AUTH_KEY_PLACEHOLDER' | translate"
                [disabled]="loading()"
              />
            </div>
            <div class="form-text">
              {{ "LOGIN.AUTH_KEY_HELP" | translate }}
            </div>
          </div>

          @if (error()) {
            <div class="alert alert-danger d-flex align-items-center" role="alert">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              {{ error() }}
            </div>
          }

          <div class="d-grid gap-2">
            <button 
              class="btn btn-primary btn-lg" 
              [disabled]="loading() || !canLogin" 
              type="submit"
            >
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ "LOGIN.CONNECTING" | translate }}
              } @else {
                <i class="bi bi-box-arrow-in-right me-2"></i>
                {{ "LOGIN.SUBMIT" | translate }}
              }
            </button>
            
            <!-- Botón secundario eliminado: el botón principal maneja ambos casos -->
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly stremio = inject(StremioService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly error = signal('');

  // Validador personalizado: requiere email+password o authKey
  private loginValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const email = group.get('email')?.value?.trim();
    const password = group.get('password')?.value;
    const authKey = group.get('authKey')?.value?.trim();
    if (authKey) return null;
    if (email && password && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
    return { login: 'LOGIN.VALIDATION_ERROR' }; // Solo la clave, se traduce en el template
  };


  readonly form = this.fb.group({
    email: ['', [Validators.email]],
    password: [''],
    authKey: ['']
  }, { validators: this.loginValidator });


  get canLogin(): boolean {
    return this.form.valid && !this.loading();
  }


  async onSubmit(): Promise<void> {
    this.error.set('');
    if (this.loading()) return;
    const { email, password, authKey } = this.form.value;
    const trimmedAuthKey = authKey?.trim();
    const trimmedEmail = email?.trim();

    if (trimmedAuthKey) {
      await this.useAuthKey(trimmedAuthKey);
      return;
    }

    if (!trimmedEmail || !password || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      this.error.set(this.translate.instant('LOGIN.PROVIDE_VALID_CREDENTIALS'));
      this.form.get('email')?.markAsTouched();
      this.form.get('password')?.markAsTouched();
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.stremio.login(trimmedEmail, password);
      if (result.success) {
        await this.router.navigate(['/dashboard']);
      } else {
        this.error.set(result.error || this.translate.instant('LOGIN.ERROR'));
      }
    } catch (err) {
      this.error.set(this.translate.instant('MESSAGES.CONNECTION_ERROR'));
    } finally {
      this.loading.set(false);
    }
  }


  async useAuthKey(authKey: string): Promise<void> {
    if (!authKey) {
      this.error.set(this.translate.instant('LOGIN.AUTH_KEY_REQUIRED'));
      this.form.get('authKey')?.markAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      await this.stremio.setAuthKeyAndFetchUser(authKey);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      // Fallback: usar método anterior
      this.stremio.setAuthKey(authKey);
      this.stremio.setUser({ authKey, email: this.translate.instant('LOGIN.AUTH_KEY_USER') });
      await this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }
}
