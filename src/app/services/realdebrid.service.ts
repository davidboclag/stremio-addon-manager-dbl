import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface RealDebridUser {
  id: number;
  username: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class RealDebridService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.realDebridApiBase;
  
  private readonly _token = signal<string | null>(this.getStoredToken());
  private readonly _user = signal<RealDebridUser | null>(null);
  
  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  setToken(token: string): void {
    this._token.set(token);
    this._user.set(null);
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
      const user = await this.http.get<RealDebridUser>(`${this.apiBase}/user`, { headers }).toPromise();

      if (user) {
        this._user.set(user);
        return { valid: true, user };
      }
      
      return { valid: false, error: 'Token inválido' };
    } catch {
      return { valid: false, error: 'Error de validación' };
    }
  }

  private getStoredToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('rd_token');
  }
}
