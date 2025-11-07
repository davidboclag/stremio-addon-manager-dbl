import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { 
  DebridProviderType, 
  DebridProviderConfig, 
  DebridUser, 
  DebridValidationResult, 
  DEBRID_SERVICES 
} from '../types/addon-configs';

@Injectable({ providedIn: 'root' })
export class DebridService {
  private readonly http = inject(HttpClient);
  
  // Signals para el estado del servicio
  private readonly _selectedProvider = signal<DebridProviderType>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<DebridUser | null>(null);
  
  // Readonly signals para exponer el estado
  readonly selectedProvider = this._selectedProvider.asReadonly();
  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  
  // Computed para obtener información del servicio actual
  readonly currentService = computed(() => {
    const provider = this._selectedProvider();
    return provider ? DEBRID_SERVICES[provider] : null;
  });
  
  // Computed para validar el token actual
  readonly isValidToken = computed(() => {
    const token = this._token();
    const service = this.currentService();
    
    if (!token || !service || !service.tokenPattern) return false;
    return service.tokenPattern.test(token);
  });
  
  readonly isAuthenticated = computed(() => this.isValidToken() && this._user() !== null);
  
  // Computed que devuelve todos los servicios disponibles
  readonly availableServices = computed(() => Object.values(DEBRID_SERVICES));

  constructor() {
    // Cargar datos del localStorage al inicializar
    queueMicrotask(() => {
      this.loadFromStorage();
      this.loadTokenFromStorage();
    });
  }

  private loadFromStorage(): void {
    const storedProvider = localStorage.getItem('debrid-provider') as DebridProviderType;
    // Cargar el proveedor primero
    if (storedProvider && DEBRID_SERVICES[storedProvider]) {
      this._selectedProvider.set(storedProvider);
    }
  }

  /**
   * Cargar token del proveedor seleccionado desde localStorage
   */
  private loadTokenFromStorage(): void {
    const provider = this._selectedProvider();
    if (!provider) return;
    const key = `debrid-token-${provider}`;
    const storedToken = localStorage.getItem(key);
    if (storedToken) {
      this._token.set(storedToken);
    }
  }

  setProvider(provider: DebridProviderType): void {
    if (provider && !DEBRID_SERVICES[provider]) {
      throw new Error(`Proveedor de debrid no soportado: ${provider}`);
    }
    // Cambiar proveedor
    this._selectedProvider.set(provider);
    // Guardar en localStorage solo si no es null
    if (provider) {
      localStorage.setItem('debrid-provider', provider);
    } else {
      localStorage.removeItem('debrid-provider');
    }
    // Limpiar token y usuario al cambiar proveedor
    if (provider) {
      this._token.set(null);
      this._user.set(null);
      // Cargar token del nuevo proveedor
      this.loadTokenFromStorage();
    } else {
      this.clearToken();
    }
  }

  setToken(token: string): void {
    const cleanToken = token.trim();
    this._token.set(cleanToken || null);
    // Guardar token en localStorage por proveedor
    const provider = this._selectedProvider();
    if (provider) {
      const key = `debrid-token-${provider}`;
      if (cleanToken) {
        localStorage.setItem(key, cleanToken);
      } else {
        localStorage.removeItem(key);
      }
    }
    // Limpiar usuario al cambiar token
    this._user.set(null);
  }

  clearToken(): void {
    const provider = this._selectedProvider();
    if (provider) {
      const key = `debrid-token-${provider}`;
      localStorage.removeItem(key);
    }
    this._token.set(null);
    this._user.set(null);
  }

  validateTokenFormat(token: string): boolean {
    const service = this.currentService();
    if (!service || !service.tokenPattern) return false; // Sin servicio = token inválido
    return service.tokenPattern.test(token);
  }
  // Método para obtener el nombre del servicio en formato para addons
  getServiceNameForAddon(): string {
    const service = this.currentService();
    return service ? service.name : 'realdebrid'; // Fallback por compatibilidad
  }

  // Método para obtener información sobre características del servicio
  getServiceFeatures() {
    const service = this.currentService();
    return service ? service.features : null;
  }
}