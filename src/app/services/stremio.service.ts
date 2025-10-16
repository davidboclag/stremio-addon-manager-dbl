// standalone service file (not decorated) but providedIn root via provideInRoot in providers arrays
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StremioUser {
  authKey: string;
  email?: string;
}

export interface AddonCollection {
  addons: any[];
  success: boolean;
}

@Injectable({ providedIn: 'root' })
export class StremioService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly base = environment.stremioApiBase;
  
  // Signals para estado reactivo
  private readonly _authKey = signal<string | null>(null);
  
  readonly authKey = this._authKey.asReadonly();
  readonly isAuthenticated = computed(() => !!this._authKey());

  constructor() {
    // Cargar authKey del localStorage al inicializar
    const storedAuthKey = localStorage.getItem('stremio_authkey');
    if (storedAuthKey) {
      this._authKey.set(storedAuthKey);
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; authKey?: string; error?: string }> {
    try {
      const body = { authKey: null, email, password };
      const response = await lastValueFrom(
        this.http.post<{ result?: any }>(`${this.base}/login`, body)
          .pipe(takeUntilDestroyed(this.destroyRef))
      );

      if (response?.result?.authKey) {
        this.setAuthKey(response.result.authKey);
        return { success: true, authKey: response.result.authKey };
      }
      
      return { success: false, error: 'Credenciales inválidas' };
    } catch (error) {
      return { success: false, error: 'Error de conexión con Stremio (CORS o credenciales)' };
    }
  }

  setAuthKey(authKey: string): void {
    this._authKey.set(authKey);
    localStorage.setItem('stremio_authkey', authKey);
  }

  clearAuth(): void {
    this._authKey.set(null);
    localStorage.removeItem('stremio_authkey');
  }

  async getAddonCollection(): Promise<AddonCollection | null> {
    const authKey = this._authKey();
    if (!authKey) return null;

    try {
      const body = { type: 'AddonCollectionGet', authKey, update: true };
      const response = await lastValueFrom(
        this.http.post<any>(`${this.base}/addonCollectionGet`, body)
          .pipe(takeUntilDestroyed(this.destroyRef))
      );

      return response?.result ? { addons: response.result.addons || [], success: true } : null;
    } catch (error) {
      return null;
    }
  }

  async setAddonCollection(addons: any[]): Promise<{ success: boolean; error?: string }> {
    const authKey = this._authKey();
    if (!authKey) return { success: false, error: 'No autenticado' };

    try {
      const payload = { type: 'AddonCollectionSet', authKey, addons };
      const response = await lastValueFrom(
        this.http.post<any>(`${this.base}/addonCollectionSet`, payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
      );

      return { success: response?.result?.success || false };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  }
}
