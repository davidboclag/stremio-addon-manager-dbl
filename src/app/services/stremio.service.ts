import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

/**
 * Constantes para el servicio de Stremio
 */
export const STREMIO_CONSTANTS = {
  STORAGE_KEYS: {
    AUTH_KEY: 'stremio_authkey',
    USER: 'stremio_user',
    EXPIRES_AT: 'stremio_expires_at'
  },
  DURATIONS: {
    REMEMBER_DAYS: 7,
    REMEMBER_MS: 7 * 24 * 60 * 60 * 1000 // 7 días en milisegundos
  }
} as const;

/**
 * Resultado de una operación de autenticación
 */
export interface AuthResult {
  success: boolean;
  authKey?: string;
  error?: string;
}

/**
 * Resultado de una operación genérica
 */
export interface OperationResult {
  success: boolean;
  error?: string;
}


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

/**
 * Servicio principal para la gestión de autenticación y usuario de Stremio.
 * 
 * Características:
 * - Gestión híbrida de sesiones (sessionStorage + localStorage)
 * - Expiración automática de sesiones
 * - Soporte para "Recordarme" con duración configurable
 * 
 * @example
 * ```typescript
 * constructor(private stremio: StremioService) {}
 * 
 * async login() {
 *   const result = await this.stremio.login(email, password, true);
 *   if (result.success) {
 *     // Usuario autenticado
 *   }
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class StremioService {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);
  private readonly apiBase = environment.stremioApiBase;
  
  private readonly _authKey = signal<string | null>(this.getStoredAuthKey());
  private readonly _user = signal<StremioUser | null>(this.getStoredUser());
  
  readonly authKey = this._authKey.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._authKey() && !this.isSessionExpired());

  constructor() {
    // Si hay authKey válido, renovar la expiración si aplica
    const authKey = this._authKey();
    const user = this._user();
    
    if (authKey) {
      // Renovar expiración si la sesión está activa y tiene "recordarme" activo
      this.refreshSessionExpiration();
      
      // Si no hay usuario, intentar obtener la información
      if (!user) {
        this.fetchUserInfo(authKey).catch(error => {
          // Log estructurado para diagnóstico
          if (environment.production) {
            // En producción, log mínimo
            console.error('StremioService: Failed to fetch user info on initialization');
          } else {
            // En desarrollo, log detallado
            console.warn('StremioService: Error fetching user info on init:', {
              error: error?.message || error,
              authKey: authKey ? 'presente' : 'ausente',
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    }
  }

  /**
   * Autentica al usuario en Stremio usando email y contraseña.
   * 
   * @param email - Dirección de correo electrónico del usuario
   * @param password - Contraseña del usuario
   * @param rememberMe - Si true, mantiene la sesión por 7 días en localStorage
   * @returns Resultado de la autenticación con authKey en caso de éxito
   * 
   * @example
   * ```typescript
   * const result = await stremio.login('user@example.com', 'password', true);
   * if (result.success) {
   *   console.log('AuthKey:', result.authKey);
   * } else {
   *   console.error('Error:', result.error);
   * }
   * ```
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<AuthResult> {
    try {
      const response = await this.http.post<{ result?: { authKey: string } }>(`${this.apiBase}/login`, {
        authKey: null,
        email,
        password
      }).toPromise();

      if (response?.result?.authKey) {
        const authKey = response.result.authKey;
        this.setAuthKey(authKey, rememberMe);
        
        // Fetch and store user information
        await this.fetchUserInfo(authKey, email);
        
        return { success: true, authKey };
      }
      
      return { success: false, error: this.translate.instant('MESSAGES.INVALID_CREDENTIALS') };
    } catch {
      return { success: false, error: this.translate.instant('MESSAGES.CONNECTION_ERROR') };
    }
  }

  /**
   * Establece el authKey y configura el almacenamiento según las preferencias.
   * 
   * @param authKey - Clave de autenticación de Stremio
   * @param rememberMe - Si true, guarda en localStorage con expiración de 7 días
   */
  setAuthKey(authKey: string, rememberMe: boolean = false): void {
    this._authKey.set(authKey);
    
    // Siempre guardar en sessionStorage para la sesión actual
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY, authKey);
    }
    
    // Solo guardar en localStorage si el usuario eligió "recordarme" con timestamp
    if (rememberMe && typeof localStorage !== 'undefined') {
      const expiresAt = Date.now() + STREMIO_CONSTANTS.DURATIONS.REMEMBER_MS;
      localStorage.setItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY, authKey);
      localStorage.setItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY);
      localStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT);
    }
  }

  async setAuthKeyAndFetchUser(authKey: string, rememberMe: boolean = false): Promise<void> {
    this.setAuthKey(authKey, rememberMe);
    await this.fetchUserInfo(authKey);
  }

  setUser(user: StremioUser): void {
    this._user.set(user);
    
    // Siempre guardar en sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STREMIO_CONSTANTS.STORAGE_KEYS.USER, JSON.stringify(user));
    }
    
    // Solo guardar en localStorage si hay expiración configurada (recordar sesión)
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT)) {
      localStorage.setItem(STREMIO_CONSTANTS.STORAGE_KEYS.USER, JSON.stringify(user));
    }
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

  /**
   * Renueva la expiración de la sesión si el usuario tiene "recordarme" activo.
   * Útil para llamar cuando el usuario realiza acciones que indican actividad.
   * 
   * @returns true si se renovó la sesión, false si no era necesario o no era posible
   */
  renewSessionExpiration(): boolean {
    if (this.isAuthenticated() && typeof localStorage !== 'undefined') {
      const expiresAt = localStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT);
      
      if (expiresAt) {
        this.refreshSessionExpiration();
        return true;
      }
    }
    
    return false;
  }

  /**
   * Limpia toda la información de autenticación del usuario.
   * Elimina datos tanto de sessionStorage como de localStorage.
   */
  clearAuth(): void {
    this._authKey.set(null);
    this._user.set(null);
    
    // Limpiar ambos storages
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY);
      sessionStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.USER);
    }
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY);
      localStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.USER);
      localStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT);
    }
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
    // Primero intentar sessionStorage (sesión actual)
    if (typeof sessionStorage !== 'undefined') {
      const sessionKey = sessionStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY);
      if (sessionKey) return sessionKey;
    }
    
    // Si no hay en sessionStorage, verificar localStorage con expiración
    if (typeof localStorage !== 'undefined') {
      const localKey = localStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY);
      const expiresAt = localStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT);
      
      if (localKey && expiresAt) {
        const expirationTime = parseInt(expiresAt, 10);
        if (Date.now() < expirationTime) {
          return localKey;
        } else {
          // Expirado, limpiar
          localStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY);
          localStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.USER);
          localStorage.removeItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT);
        }
      }
    }
    
    return null;
  }

  private getStoredUser(): StremioUser | null {
    // Primero intentar sessionStorage (sesión actual)
    if (typeof sessionStorage !== 'undefined') {
      const sessionUser = sessionStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.USER);
      if (sessionUser) {
        try {
          return JSON.parse(sessionUser);
        } catch {
          return null;
        }
      }
    }
    
    // Si no hay en sessionStorage, verificar localStorage con expiración
    if (typeof localStorage !== 'undefined') {
      const localUser = localStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.USER);
      const expiresAt = localStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT);
      
      if (localUser && expiresAt) {
        const expirationTime = parseInt(expiresAt, 10);
        if (Date.now() < expirationTime) {
          try {
            return JSON.parse(localUser);
          } catch {
            return null;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Verifica si la sesión actual ha expirado
   */
  private isSessionExpired(): boolean {
    // Si hay sesión en sessionStorage, no ha expirado
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY)) {
      return false;
    }
    
    // Verificar expiración en localStorage
    if (typeof localStorage !== 'undefined') {
      const expiresAt = localStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT);
      if (expiresAt) {
        return Date.now() >= parseInt(expiresAt, 10);
      }
    }
    
    return true;
  }

  /**
   * Renueva el tiempo de expiración de la sesión si está configurada para "recordar".
   * Esto implementa "sliding expiration" - cada vez que el usuario accede,
   * se extiende la sesión por 7 días más desde ese momento.
   */
  private refreshSessionExpiration(): void {
    if (typeof localStorage !== 'undefined') {
      const authKey = localStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.AUTH_KEY);
      const expiresAt = localStorage.getItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT);
      
      // Solo renovar si hay sesión persistente activa y no expirada
      if (authKey && expiresAt) {
        const currentExpiration = parseInt(expiresAt, 10);
        const now = Date.now();
        
        // Si la sesión aún es válida, renovar la expiración
        if (now < currentExpiration) {
          const newExpiration = now + STREMIO_CONSTANTS.DURATIONS.REMEMBER_MS;
          localStorage.setItem(STREMIO_CONSTANTS.STORAGE_KEYS.EXPIRES_AT, newExpiration.toString());
          
          // Log en desarrollo para seguimiento
          if (!environment.production) {
            console.log('StremioService: Session expiration refreshed', {
              previousExpiration: new Date(currentExpiration).toISOString(),
              newExpiration: new Date(newExpiration).toISOString(),
              extendedBy: STREMIO_CONSTANTS.DURATIONS.REMEMBER_DAYS + ' days'
            });
          }
        }
      }
    }
  }
}
