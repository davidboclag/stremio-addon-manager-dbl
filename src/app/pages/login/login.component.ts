import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StremioService } from '../../services/stremio.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card shadow mx-auto mt-5" style="max-width:520px">
      <div class="card-body">
        <div class="text-center mb-4">
          <i class="bi bi-shield-lock display-4 text-primary"></i>
          <h4 class="card-title mt-3">Acceso a Stremio</h4>
          <p class="text-muted">Introduce tus credenciales o AuthKey</p>
        </div>

        <form (ngSubmit)="onSubmit()" #f="ngForm">
          <div class="mb-3">
            <label class="form-label fw-semibold">Email</label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-envelope"></i>
              </span>
              <input 
                class="form-control" 
                [(ngModel)]="email" 
                name="email" 
                type="email" 
                placeholder="tu@email.com"
                [disabled]="loading()"
                required
              />
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
                [(ngModel)]="password" 
                name="password" 
                type="password" 
                placeholder="Tu contraseña"
                [disabled]="loading()"
                required
              />
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
                [(ngModel)]="authKey" 
                name="authKey" 
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
              [disabled]="loading() || (!authKey && f.invalid)" 
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
            
            @if (authKey) {
              <button 
                class="btn btn-outline-secondary" 
                type="button" 
                (click)="useAuthKey()"
                [disabled]="loading()"
              >
                <i class="bi bi-key me-2"></i>
                Usar solo AuthKey
              </button>
            }
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

  email = '';
  password = '';
  authKey = '';
  
  readonly loading = signal(false);
  readonly error = signal('');

  async onSubmit(): Promise<void> {
    this.error.set('');
    
    if (this.authKey) {
      this.useAuthKey();
      return;
    }

    if (!this.email || !this.password) {
      this.error.set('Proporciona email y contraseña o authKey');
      return;
    }

    this.loading.set(true);
    
    try {
      const result = await this.stremio.login(this.email, this.password);
      
      if (result.success) {
        await this.router.navigate(['/dashboard']);
      } else {
        this.error.set(result.error || 'Error de login');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async useAuthKey(): Promise<void> {
    if (!this.authKey.trim()) {
      this.error.set('Introduce authKey.');
      return;
    }
    
    this.loading.set(true);
    this.error.set('');
    
    try {
      await this.stremio.setAuthKeyAndFetchUser(this.authKey.trim());
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error setting authKey:', error);
      // Fallback: usar método anterior
      this.stremio.setAuthKey(this.authKey.trim());
      const user = {
        authKey: this.authKey.trim(),
        email: 'Usuario AuthKey'
      };
      this.stremio.setUser(user);
      await this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }
}
