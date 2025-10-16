import { Component, inject, signal } from '@angular/core';
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
      <h4 class="card-title mb-3">Login Stremio / AuthKey</h4>

      <form (ngSubmit)="onSubmit()" #f="ngForm">
        <div class="mb-2">
          <label class="form-label">Email</label>
          <input 
            class="form-control" 
            [(ngModel)]="email" 
            name="email" 
            type="email" 
            [disabled]="loading()"
          />
        </div>

        <div class="mb-2">
          <label class="form-label">Password</label>
          <input 
            class="form-control" 
            [(ngModel)]="password" 
            name="password" 
            type="password" 
            [disabled]="loading()"
          />
        </div>

        <div class="mb-3">
          <label class="form-label">o AuthKey (opcional)</label>
          <input 
            class="form-control" 
            [(ngModel)]="authKey" 
            name="authKey" 
            [disabled]="loading()"
          />
          <div class="form-text">
            Si tienes tu AuthKey, puedes usarlo directamente
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-danger py-2">{{ error() }}</div>
        }

        <div class="d-flex gap-2">
          <button 
            class="btn btn-primary" 
            [disabled]="loading() || f.invalid" 
            type="submit"
          >
            @if (loading()) {
              <span class="spinner-border spinner-border-sm me-2"></span>
            }
            {{ loading() ? 'Conectando...' : 'Login' }}
          </button>
          
          <button 
            class="btn btn-outline-secondary" 
            type="button" 
            (click)="useAuthKey()"
            [disabled]="loading() || !authKey"
          >
            Usar AuthKey
          </button>
        </div>
      </form>
    </div>
  </div>
  `,
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

  useAuthKey(): void {
    if (!this.authKey.trim()) {
      this.error.set('Introduce authKey.');
      return;
    }
    
    this.stremio.setAuthKey(this.authKey.trim());
    this.router.navigate(['/dashboard']);
  }
}
