import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { StremioService } from '../../services/stremio.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card shadow mx-auto mt-5" style="max-width:520px">
      <div class="card-body">
        <div class="text-center mb-4">
          <i class="bi bi-shield-lock display-4 text-primary"></i>
          <h4 class="card-title mt-3">Acceso a Stremio</h4>
          <p class="text-muted">Introduce tus credenciales o AuthKey</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="mb-3">
            <label class="form-label fw-semibold">Email</label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-envelope"></i>
              </span>
              <input 
                class="form-control" 
                formControlName="email" 
                type="email" 
                placeholder="tu@email.com"
                [disabled]="loading()"
                [class.is-invalid]="form.get('email')?.invalid && (form.get('email')?.touched || form.get('email')?.dirty)"
              />
            </div>
            <div *ngIf="form.get('email')?.invalid && (form.get('email')?.touched || form.get('email')?.dirty) && !form.get('authKey')?.value" class="invalid-feedback d-block">
              Ingresa un email válido.
            </div>
            <div *ngIf="form.errors?.['login'] && (form.get('email')?.touched || form.get('password')?.touched || form.get('authKey')?.touched)" class="invalid-feedback d-block">
              {{ form.errors?.['login'] }}
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Contraseña</label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-lock"></i>
              </span>
              <input 
                class="form-control" 
                formControlName="password" 
                type="password" 
                placeholder="Tu contraseña"
                [disabled]="loading()"
                [class.is-invalid]="form.get('password')?.invalid && (form.get('password')?.touched || form.get('password')?.dirty)"
              />
            </div>
            <div *ngIf="form.get('password')?.invalid && (form.get('password')?.touched || form.get('password')?.dirty) && !form.get('authKey')?.value" class="invalid-feedback d-block">
              Ingresa una contraseña.
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">AuthKey <small class="text-muted">(opcional)</small></label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-key"></i>
              </span>
              <input 
                class="form-control" 
                formControlName="authKey" 
                placeholder="Si ya tienes tu AuthKey..."
                [disabled]="loading()"
              />
            </div>
            <div class="form-text">
              Si tienes tu AuthKey, puedes usarlo directamente sin email/contraseña
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
                Conectando...
              } @else {
                <i class="bi bi-box-arrow-in-right me-2"></i>
                Iniciar sesión
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

  readonly loading = signal(false);
  readonly error = signal('');

  // Validador personalizado: requiere email+password o authKey
  private loginValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const email = group.get('email')?.value?.trim();
    const password = group.get('password')?.value;
    const authKey = group.get('authKey')?.value?.trim();
    if (authKey) return null;
    if (email && password && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
    return { login: 'Debes ingresar authKey o email y contraseña válidos' };
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
      this.error.set('Proporciona email válido y contraseña o authKey');
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
        this.error.set(result.error || 'Error de login');
      }
    } catch (err) {
      this.error.set('Error de conexión');
    } finally {
      this.loading.set(false);
    }
  }


  async useAuthKey(authKey: string): Promise<void> {
    if (!authKey) {
      this.error.set('Introduce authKey.');
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
      this.stremio.setUser({ authKey, email: 'Usuario AuthKey' });
      await this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }
}
