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
    // Usar queueMicrotask para asegurar que se ejecute después del ciclo de renderizado inicial
    queueMicrotask(() => {
      this.loadFromStorage();
    });
  }

  private loadFromStorage(): void {
    const storedProvider = localStorage.getItem('debrid-provider') as DebridProviderType;
    
    // Cargar el proveedor primero
    if (storedProvider && DEBRID_SERVICES[storedProvider]) {
      this._selectedProvider.set(storedProvider);
    }
    
    // Cargar el token específico para este proveedor
    const currentProvider = this._selectedProvider();
    const storedToken = localStorage.getItem(`debrid-token-${currentProvider}`);
    
    if (storedToken) {
      this._token.set(storedToken);
      
      // Si el token no es válido para el proveedor actual, limpiar
      if (!this.validateTokenFormat(storedToken)) {
        const currentService = this.currentService();
        console.warn(`Token almacenado no es válido para ${currentService?.displayName || 'el servicio seleccionado'}, limpiando...`);
        this.clearToken();
      }
    }
  }

  setProvider(provider: DebridProviderType): void {
    if (provider && !DEBRID_SERVICES[provider]) {
      throw new Error(`Proveedor de debrid no soportado: ${provider}`);
    }
    
    // Guardar el token actual antes de cambiar proveedor
    const currentToken = this._token();
    const currentProvider = this._selectedProvider();
    
    // Solo guardar el token si hay un proveedor actual válido
    if (currentToken && currentProvider) {
      localStorage.setItem(`debrid-token-${currentProvider}`, currentToken);
    }
    
    // Cambiar proveedor
    this._selectedProvider.set(provider);
    
    // Guardar en localStorage solo si no es null
    if (provider) {
      localStorage.setItem('debrid-provider', provider);
    } else {
      localStorage.removeItem('debrid-provider');
    }
    
    // Cargar token del nuevo proveedor (solo si provider no es null)
    if (provider) {
      const savedToken = localStorage.getItem(`debrid-token-${provider}`);
      if (savedToken && this.validateTokenFormat(savedToken)) {
        this._token.set(savedToken);
      } else {
        this.clearToken();
      }
    } else {
      this.clearToken();
    }
    
    // Limpiar usuario al cambiar proveedor
    this._user.set(null);
  }

  setToken(token: string): void {
    const cleanToken = token.trim();
    this._token.set(cleanToken || null);
    
    const currentProvider = this._selectedProvider();
    
    if (cleanToken) {
      localStorage.setItem(`debrid-token-${currentProvider}`, cleanToken);
    } else {
      localStorage.removeItem(`debrid-token-${currentProvider}`);
    }
    
    // Limpiar usuario al cambiar token
    this._user.set(null);
  }

  clearToken(): void {
    this._token.set(null);
    this._user.set(null);
    
    const currentProvider = this._selectedProvider();
    localStorage.removeItem(`debrid-token-${currentProvider}`);
  }

  validateTokenFormat(token: string): boolean {
    const service = this.currentService();
    if (!service || !service.tokenPattern) return false; // Sin servicio = token inválido
    return service.tokenPattern.test(token);
  }

  async validateToken(token?: string): Promise<DebridValidationResult> {
    const tokenToValidate = token || this._token();
    const service = this.currentService();
    
    if (!service) {
      return { valid: false, error: 'No hay servicio debrid seleccionado' };
    }
    
    if (!tokenToValidate) {
      return { valid: false, error: 'No hay token proporcionado' };
    }

    if (!this.validateTokenFormat(tokenToValidate)) {
      return { 
        valid: false, 
        error: `Token inválido para ${service.displayName}. Debe tener ${service.tokenLength} caracteres alfanuméricos.`
      };
    }

    try {
      const user = await this.fetchUserInfo(tokenToValidate);
      if (user) {
        this._user.set(user);
        return { valid: true, user };
      } else {
        return { valid: false, error: 'Token inválido o usuario no encontrado' };
      }
    } catch (error) {
      console.error('Error validating token:', error);
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Error de conexión'
      };
    }
  }

  private async fetchUserInfo(token: string): Promise<DebridUser | null> {
    const service = this.currentService();
    
    if (!service) {
      console.error('No hay servicio seleccionado');
      return null;
    }
    
    const headers = this.getAuthHeaders(token);
    
    try {
      switch (service.id) {
        case 'realdebrid':
          return await this.fetchRealDebridUser(token, headers);
        case 'alldebrid':
          return await this.fetchAllDebridUser(token, headers);
        case 'premiumize':
          return await this.fetchPremiumizeUser(token, headers);
        case 'debridlink':
          return await this.fetchDebridLinkUser(token, headers);
        case 'easydebrid':
          return await this.fetchEasyDebridUser(token, headers);
        case 'torbox':
          return await this.fetchTorBoxUser(token, headers);
        default:
          throw new Error(`Método de validación no implementado para ${service.displayName}`);
      }
    } catch (error) {
      console.error(`Error fetching user info for ${service.displayName}:`, error);
      return null;
    }
  }

  private getAuthHeaders(token: string): HttpHeaders {
    const service = this.currentService();
    
    if (!service) {
      return new HttpHeaders();
    }
    
    switch (service.id) {
      case 'realdebrid':
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      case 'alldebrid':
        return new HttpHeaders(); // AllDebrid usa el token como parámetro
      case 'premiumize':
        return new HttpHeaders(); // Premiumize usa el token como parámetro
      case 'debridlink':
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      case 'easydebrid':
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      case 'torbox':
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      default:
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }
  }

  private async fetchRealDebridUser(token: string, headers: HttpHeaders): Promise<DebridUser | null> {
    const service = this.currentService();
    if (!service) return null;
    
    const response = await this.http.get<any>(`${service.apiBaseUrl}/user`, { headers }).toPromise();
    return {
      id: response.id,
      username: response.username,
      email: response.email,
      premium: true,
      expiration: response.expiration
    };
  }

  private async fetchAllDebridUser(token: string, headers: HttpHeaders): Promise<DebridUser | null> {
    const service = this.currentService();
    if (!service) return null;
    
    const response = await this.http.get<any>(`${service.apiBaseUrl}/user?agent=stremio-addon-manager&apikey=${token}`).toPromise();
    if (response.status === 'success') {
      return {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        premium: response.data.user.isPremium,
        expiration: response.data.user.premiumUntil
      };
    }
    return null;
  }

  private async fetchPremiumizeUser(token: string, headers: HttpHeaders): Promise<DebridUser | null> {
    const service = this.currentService();
    if (!service) return null;
    
    const response = await this.http.get<any>(`${service.apiBaseUrl}/account/info?apikey=${token}`).toPromise();
    if (response.status === 'success') {
      return {
        id: response.customer_id,
        username: response.customer_id,
        email: response.email,
        premium: true,
        expiration: response.premium_until
      };
    }
    return null;
  }

  private async fetchDebridLinkUser(token: string, headers: HttpHeaders): Promise<DebridUser | null> {
    const service = this.currentService();
    if (!service) return null;
    
    const response = await this.http.get<any>(`${service.apiBaseUrl}/account/infos`, { headers }).toPromise();
    if (response.success) {
      return {
        id: response.value.id,
        username: response.value.username,
        email: response.value.email,
        premium: response.value.accountType === 'premium',
        expiration: response.value.premiumLeft
      };
    }
    return null;
  }

  private async fetchEasyDebridUser(token: string, headers: HttpHeaders): Promise<DebridUser | null> {
    const service = this.currentService();
    if (!service) return null;
    
    const response = await this.http.get<any>(`${service.apiBaseUrl}/user`, { headers }).toPromise();
    return {
      id: response.id,
      username: response.username,
      email: response.email,
      premium: true
    };
  }

  private async fetchTorBoxUser(token: string, headers: HttpHeaders): Promise<DebridUser | null> {
    const service = this.currentService();
    if (!service) return null;
    
    const response = await this.http.get<any>(`${service.apiBaseUrl}/user/me`, { headers }).toPromise();
    if (response.success) {
      return {
        id: response.data.id,
        username: response.data.email,
        email: response.data.email,
        premium: response.data.plan !== 'free'
      };
    }
    return null;
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