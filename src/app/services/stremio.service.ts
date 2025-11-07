import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';


export interface StremioUserInfo {
  email: string;
  fullname?: string;
  dateRegistered?: string;
  premium_expire?: string;
  [key: string]: any;
}

export interface StremioUser {
  authKey: string;
  email: string;
  fullname?: string;
  dateRegistered?: string;
  premium_expire?: string;
  user?: StremioUserInfo;
}

interface GetUserResponse {
  result?: StremioUserInfo;
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
  private readonly translate = inject(TranslateService);
  private readonly apiBase = environment.stremioApiBase;
  
  private readonly _authKey = signal<string | null>(this.getStoredAuthKey());
  private readonly _user = signal<StremioUser | null>(this.getStoredUser());
  
  readonly authKey = this._authKey.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._authKey());

  constructor() {
    // Si hay authKey pero no hay usuario, intentar obtener la información
    const authKey = this._authKey();
    const user = this._user();
    
    if (authKey && !user) {
      this.fetchUserInfo(authKey).catch(error => {
        console.warn('Error fetching user info on init:', error);
      });
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; authKey?: string; error?: string }> {
    try {
      const response = await this.http.post<{ result?: { authKey: string } }>(`${this.apiBase}/login`, {
        authKey: null,
        email,
        password
      }).toPromise();

      if (response?.result?.authKey) {
        const authKey = response.result.authKey;
        this.setAuthKey(authKey);
        
        // Fetch and store user information
        await this.fetchUserInfo(authKey, email);
        
        return { success: true, authKey };
      }
      
      return { success: false, error: this.translate.instant('MESSAGES.INVALID_CREDENTIALS') };
    } catch {
      return { success: false, error: this.translate.instant('MESSAGES.CONNECTION_ERROR') };
    }
  }

  setAuthKey(authKey: string): void {
    this._authKey.set(authKey);
    localStorage.setItem('stremio_authkey', authKey);
  }

  async setAuthKeyAndFetchUser(authKey: string): Promise<void> {
    this.setAuthKey(authKey);
    await this.fetchUserInfo(authKey);
  }

  setUser(user: StremioUser): void {
    this._user.set(user);
    localStorage.setItem('stremio_user', JSON.stringify(user));
  }

  async fetchUserInfo(authKey: string, email?: string): Promise<void> {
    try {
      // Usar getUser que sabemos que funciona
      const response = await this.http.post<GetUserResponse>(`${this.apiBase}/getUser`, {
        type: 'GetUser',
        authKey
      }).toPromise();

      if (response?.result?.email) {
        const user: StremioUser = {
          authKey,
          email: response.result.email,
          fullname: response.result.fullname || '',
          dateRegistered: response.result.dateRegistered,
          premium_expire: response.result.premium_expire,
          user: response.result
        };
        this.setUser(user);
        return;
      }
    } catch (error) {
      console.warn('Error fetching user info from getUser:', error);
    }

    // Fallback: usar el email del login o placeholder
    const user: StremioUser = {
      authKey,
      email: email || this.translate.instant('MESSAGES.EMAIL_NOT_AVAILABLE')
    };
    this.setUser(user);
  }

  clearAuth(): void {
    this._authKey.set(null);
    this._user.set(null);
    localStorage.removeItem('stremio_authkey');
    localStorage.removeItem('stremio_user');
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
    if (!authKey) return { success: false, error: this.translate.instant('MESSAGES.NOT_AUTHENTICATED') };

    try {
      const response = await this.http.post<{ result?: { success: boolean } }>(`${this.apiBase}/addonCollectionSet`, {
        type: 'AddonCollectionSet',
        authKey,
        addons
      }).toPromise();

      return { success: response?.result?.success || false };
    } catch {
      return { success: false, error: this.translate.instant('MESSAGES.CONNECTION_ERROR') };
    }
  }

  private getStoredAuthKey(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('stremio_authkey');
  }

  private getStoredUser(): StremioUser | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem('stremio_user');
    return stored ? JSON.parse(stored) : null;
  }
}
