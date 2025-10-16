import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface StremioUser {
  authKey: string;
  email?: string;
}

export interface AddonCollection {
  addons: StremioAddon[];
  success: boolean;
}

export interface StremioAddon {
  transportUrl: string;
  transportName?: string;
  manifest?: AddonManifest;
  flags?: AddonFlags;
}

interface AddonManifest {
  id: string;
  name: string;
  description?: string;
  version?: string;
  logo?: string;
  icon?: string;
}

interface AddonFlags {
  official: boolean;
  protected: boolean;
}

@Injectable({ providedIn: 'root' })
export class StremioService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.stremioApiBase;
  
  private readonly _authKey = signal<string | null>(this.getStoredAuthKey());
  
  readonly authKey = this._authKey.asReadonly();
  readonly isAuthenticated = computed(() => !!this._authKey());

  async login(email: string, password: string): Promise<{ success: boolean; authKey?: string; error?: string }> {
    try {
      const response = await this.http.post<{ result?: { authKey: string } }>(`${this.apiBase}/login`, {
        authKey: null,
        email,
        password
      }).toPromise();

      if (response?.result?.authKey) {
        this.setAuthKey(response.result.authKey);
        return { success: true, authKey: response.result.authKey };
      }
      
      return { success: false, error: 'Credenciales inválidas' };
    } catch {
      return { success: false, error: 'Error de conexión' };
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
      const response = await this.http.post<{ result?: { addons: StremioAddon[] } }>(`${this.apiBase}/addonCollectionGet`, {
        type: 'AddonCollectionGet',
        authKey,
        update: true
      }).toPromise();

      return response?.result ? { addons: response.result.addons || [], success: true } : null;
    } catch {
      return null;
    }
  }

  async setAddonCollection(addons: StremioAddon[]): Promise<{ success: boolean; error?: string }> {
    const authKey = this._authKey();
    if (!authKey) return { success: false, error: 'No autenticado' };

    try {
      const response = await this.http.post<{ result?: { success: boolean } }>(`${this.apiBase}/addonCollectionSet`, {
        type: 'AddonCollectionSet',
        authKey,
        addons
      }).toPromise();

      return { success: response?.result?.success || false };
    } catch {
      return { success: false, error: 'Error de conexión' };
    }
  }

  private getStoredAuthKey(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('stremio_authkey');
  }
}
