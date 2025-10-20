import {
  Component,
  inject,
  computed,
  effect,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StremioService } from '../../services/stremio.service';
import { DebridService } from '../../services/debrid.service';
import { PreferencesService, Language } from '../../services/preferences.service';
import { AddonConfigService } from '../../services/addon-config.service';
import { AddonInstallationService } from '../../services/addon-installation.service';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { AddonsComponent } from '../addons/addons.component';
import { AddonTabsComponent } from '../addons/addons-tabs.component';
import {
  DebridProviderType,
  PresetType
} from '../../types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AddonsComponent, AddonTabsComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly router = inject(Router);

  // Servicios inyectados
  readonly stremio = inject(StremioService);
  readonly debridService = inject(DebridService);
  readonly preferences = inject(PreferencesService);
  readonly addonConfig = inject(AddonConfigService);
  readonly installation = inject(AddonInstallationService);
  readonly dashboardState = inject(DashboardStateService);

  // Token input para el debrid provider
  debridTokenInput = this.debridService.token() || '';

  // Computed properties delegadas a los servicios
  readonly isLoading = computed(() => this.installation.progress().isLoading);
  readonly progressText = computed(() => this.installation.progress().message);
  readonly loadingTitle = computed(() => this.installation.progress().title);

  readonly canInstall = computed(() =>
    this.stremio.isAuthenticated() && !this.isLoading()
  );

  readonly hasValidToken = computed(() => this.debridService.isValidToken());

  readonly languageOptions = computed(() => this.dashboardState.languageOptions());

  readonly availablePresets = computed(() => this.installation.getAvailablePresets());

  readonly currentPreset = computed(() => this.dashboardState.currentPreset());

  readonly canInstallPreset = computed(() => {
    const preset = this.currentPreset();
    return this.canInstall() && (!preset.requiresToken || this.hasValidToken());
  });

  readonly effectivePresetAddons = computed(() => this.dashboardState.effectivePresetAddons());

  readonly filteredAddons = computed(() => this.dashboardState.filteredAddons());

  // Computed signal para el estado de incluir anime addons
  readonly showAnimeAddons = computed(() => this.dashboardState.includeAnimeAddons());

  // Propiedades para selectores con getter/setter
  get selectedDebridProvider(): string {
    const provider = this.debridService.selectedProvider();
    return provider === null ? '' : provider;
  }

  set selectedDebridProvider(value: string | DebridProviderType) {
    const normalizedValue: DebridProviderType = value === '' ? null : value as DebridProviderType;
    if (normalizedValue !== this.debridService.selectedProvider()) {
      this.debridService.setProvider(normalizedValue);
    }
  }

  get selectedLanguage(): Language {
    return this.preferences.selectedLanguage();
  }

  set selectedLanguage(value: Language) {
    this.preferences.setLanguage(value);
  }

  get selectedPreset() {
    return this.dashboardState.selectedPreset();
  }

  set selectedPreset(value: PresetType) {
    this.dashboardState.setSelectedPreset(value);
  }

  // Getter/setter para includeAnimeAddons
  get includeAnimeAddons() {
    return this.dashboardState.includeAnimeAddons();
  }

  set includeAnimeAddons(value: boolean) {
    this.dashboardState.setIncludeAnimeAddons(value);
  }

  // Iframes dinámicos (legacy - se puede eliminar si no se usa)
  iframeUrls: string[] = [];

  constructor() {
    // Effect para sincronizar el input del token con el servicio
    effect(() => {
      const serviceToken = this.debridService.token();
      this.debridTokenInput = serviceToken || '';
    }, { allowSignalWrites: true });
  }

  /**
   * Maneja el cambio de token
   */
  async onTokenChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const token = target.value.trim();
    this.debridService.setToken(token);
  }

  /**
   * Maneja el cambio de proveedor debrid
   */
  onDebridProviderChange(provider: DebridProviderType): void {
    this.debridService.setProvider(provider);
  }

  /**
   * Copia el token al portapapeles
   */
  copyToken(): void {
    const token = this.debridService.token();
    if (!token) {
      alert('No hay token');
      return;
    }

    navigator.clipboard.writeText(token).then(() => {
      alert('Token copiado');
    });
  }

  /**
   * Instala el preset seleccionado
   */
  async configureAll(): Promise<void> {
    const result = await this.installation.installPreset(
      this.selectedPreset,
      this.includeAnimeAddons
    );

    if (result.success) {
      setTimeout(() => this.reloadAddons(), 2000);
    } else if (result.error) {
      alert(result.error);
    }
  }

  /**
   * Instala un preset específico
   */
  async installPreset(presetType: PresetType): Promise<void> {
    const result = await this.installation.installPreset(presetType, this.includeAnimeAddons);

    if (result.success) {
      setTimeout(() => this.reloadAddons(), 2000);
    } else if (result.error) {
      alert(result.error);
    }
  }

  /**
   * Resetea Stremio a la configuración de fábrica
   */
  async resetStremio(): Promise<void> {
    const confirmacion = confirm(
      '¿Seguro que deseas borrar tu configuración actual de Stremio y volver al estado de fábrica?'
    );
    if (!confirmacion) return;

    const result = await this.installation.resetStremio();

    if (result.success) {
      setTimeout(() => this.reloadAddons(), 1500);
    } else if (result.error) {
      alert(result.error);
    }
  }

  /**
   * Cierra la sesión
   */
  logout(): void {
    this.stremio.clearAuth();
    this.debridService.clearToken();
    this.router.navigate(['/']);
  }

  /**
   * Recarga la página
   */
  reloadAddons(): void {
    location.reload();
  }

  /**
   * Obtiene los nombres de addons filtrados
   */
  getFilteredAddonNames(): string[] {
    return this.dashboardState.getFilteredAddonNames();
  }
}