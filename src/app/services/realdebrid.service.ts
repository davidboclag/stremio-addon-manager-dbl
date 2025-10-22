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
  
  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<RealDebridUser | null>(null);
  
  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  
  // Validación mejorada del token
  readonly isValidToken = computed(() => {
    const token = this._token();
    return token ? this.validateTokenFormat(token) : false;
  });
  
  readonly isAuthenticated = computed(() => this.isValidToken());

  setToken(token: string): void {
    const cleanToken = token.trim();
    this._token.set(cleanToken);
    this._user.set(null);
    
    // Ya no guardar tokens en localStorage - solo mantener en memoria durante la sesión
  }

  clearToken(): void {
    this._token.set(null);
    this._user.set(null);
    
    // Ya no eliminar tokens de localStorage - solo limpiar memoria
  }

  validateTokenFormat(token: string): boolean {
    // Token Real-Debrid tiene exactamente 52 caracteres alfanuméricos
    const regex = /^[A-Za-z0-9]{52}$/;
    return regex.test(token);
  }

  async validateToken(token: string): Promise<{ valid: boolean; user?: RealDebridUser; error?: string }> {
    if (!this.validateTokenFormat(token)) {
      return { valid: false, error: 'Formato de token inválido (debe tener 52 caracteres)' };
    }

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

  // Ya no cargar tokens desde localStorage - solo mantener en memoria durante la sesión
}
