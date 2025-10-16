import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RealDebridUser {
  id: number;
  username: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class RealDebridService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly base = environment.realDebridApiBase;
  
  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<RealDebridUser | null>(null);
  
  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  constructor() {
    const storedToken = localStorage.getItem('rd_token');
    if (storedToken) {
      this._token.set(storedToken);
    }
  }

  // Métodos de compatibilidad con el código existente
  saveToken(token: string): void {
    this.setToken(token);
  }

  getToken(): string | null {
    return this._token();
  }

  removeToken(): void {
    this.clearToken();
  }

  setToken(token: string): void {
    this._token.set(token);
    localStorage.setItem('rd_token', token);
  }

  clearToken(): void {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem('rd_token');
  }

  async validateToken(token: string): Promise<{ valid: boolean; user?: RealDebridUser; error?: string }> {
    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const response = await lastValueFrom(
        this.http.get<RealDebridUser>(`${this.base}/user`, { headers })
          .pipe(takeUntilDestroyed(this.destroyRef))
      );

      if (response) {
        this._user.set(response);
        return { valid: true, user: response };
      }
      
      return { valid: false, error: 'Token inválido' };
    } catch (error) {
      return { valid: false, error: 'Error de validación' };
    }
  }

  // --- Funciones de apertura de addons con token ---

  async abrirCometConToken(token: string): Promise<void> {
    const baseUrl = 'https://comet.strem.io/install';
    const url = `${baseUrl}?token=${token}`;
    window.open(url, '_blank');
  }

  async abrirJackettioConToken(token: string): Promise<void> {
    const baseUrl = 'https://jackettio.strem.io/install';
    const url = `${baseUrl}?token=${token}`;
    window.open(url, '_blank');
  }

  async configurarMediaFusion(token: string): Promise<void> {
    const baseUrl = 'https://mediafusion.strem.io/install';
    const payload = btoa(JSON.stringify({ token })); // base64 payload
    const url = `${baseUrl}?data=${payload}`;
    window.open(url, '_blank');
  }

  generateAddonUrl(baseUrl: string, config: Record<string, any> = {}): string {
    const token = this._token();
    if (token && config) {
      config['debridApiKey'] = token;
    }
    
    const encodedConfig = btoa(JSON.stringify(config));
    return `${baseUrl}/${encodedConfig}/configure`;
  }

  openAddonWithToken(baseUrl: string, config: Record<string, any> = {}): void {
    const token = this._token();
    if (!token) {
      throw new Error('Token de Real-Debrid requerido');
    }
    
    const url = this.generateAddonUrl(baseUrl, config);
    window.open(url, '_blank');
  }
}
