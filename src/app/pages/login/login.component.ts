import { Component } from '@angular/core';
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
          <input class="form-control" [(ngModel)]="email" name="email" type="email" />
        </div>

        <div class="mb-2">
          <label class="form-label">Password</label>
          <input class="form-control" [(ngModel)]="password" name="password" type="password" />
        </div>

        <div class="mb-3">
          <label class="form-label">o AuthKey (opcional)</label>
          <input class="form-control" [(ngModel)]="authKey" name="authKey" />
        </div>

        <div *ngIf="error" class="alert alert-danger py-1">{{ error }}</div>

        <div class="d-flex gap-2">
          <button class="btn btn-primary" [disabled]="loading" type="submit">
            {{ loading ? 'Conectando...' : 'Login' }}
          </button>
          <button class="btn btn-outline-secondary" type="button" (click)="useAuthKey()">
            Usar AuthKey
          </button>
        </div>
      </form>
    </div>
  </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  authKey = '';
  loading = false;
  error = '';

  constructor(private stremio: StremioService, private router: Router) {}

  async onSubmit() {
    this.error = '';
    if (this.authKey) {
      // usar authKey directamente
      localStorage.setItem('stremio_authkey', this.authKey);
      this.router.navigate(['/dashboard']);
      return;
    }

    if (!this.email || !this.password) {
      this.error = 'Proporciona email y contraseña o authKey';
      return;
    }

    this.loading = true;
    try {
      const res: any = await this.stremio.login(this.email, this.password);
      if (res?.result?.authKey) {
        localStorage.setItem('stremio_authkey', res.result.authKey);
        this.router.navigate(['/dashboard']);
      } else {
        this.error = 'Login fallido. Revisa credenciales.';
      }
    } catch (err: any) {
      console.error(err);
      this.error = 'Error al conectar con Stremio (CORS o credenciales).';
    } finally {
      this.loading = false;
    }
  }

  useAuthKey() {
    if (!this.authKey) { this.error = 'Introduce authKey.'; return; }
    localStorage.setItem('stremio_authkey', this.authKey);
    this.router.navigate(['/dashboard']);
  }
}
