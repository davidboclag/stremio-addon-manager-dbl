import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { 
  PresetType, 
  ADDON_PRESETS
} from '../types/addon-configs';
import { PreferencesService, Language, ADDON_LANGUAGE_SUPPORT, LANGUAGES } from './preferences.service';
import { AddonConfigService } from './addon-config.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  private readonly preferences = inject(PreferencesService);
  private readonly addonConfig = inject(AddonConfigService);

  // Signals para el estado del dashboard
  private readonly _selectedPreset = signal<PresetType>('recommended');
  private readonly _includeAnimeAddons = signal<boolean>(false);

  // Readonly signals
  readonly selectedPreset = this._selectedPreset.asReadonly();
  readonly includeAnimeAddons = this._includeAnimeAddons.asReadonly();

  // Computed para configuraciones predefinidas
  readonly availablePresets = computed(() => Object.values(ADDON_PRESETS));
  readonly currentPreset = computed(() => ADDON_PRESETS[this._selectedPreset()]);

  // Computed para addons del preset actual
  readonly presetAddons = computed(() => {
    const preset = this.currentPreset();
    return this.addonConfig.getAddonsByPreset(preset.addonNames);
  });

  // Computed que obtiene los addons efectivos (con o sin anime)
  readonly effectivePresetAddons = computed(() => {
    const preset = this.currentPreset();
    return this.addonConfig.getEffectiveAddons(
      preset.addonNames, 
      this._includeAnimeAddons()
    );
  });

  // Computed que filtra los addons basándose en el idioma seleccionado
  readonly filteredAddons = computed(() => {
    const currentLang = this.preferences.selectedLanguage();
    return this.addonConfig.addons().filter(addon => {
      // Verificar si el addon tiene soporte de idioma definido
      const supportedLanguages = ADDON_LANGUAGE_SUPPORT[addon.name];
      if (supportedLanguages) {
        return supportedLanguages.includes(currentLang);
      }
      // Si no está definido en ADDON_LANGUAGE_SUPPORT, se muestra por defecto
      return true;
    });
  });

  // Computed que obtiene la lista de addons no disponibles para el idioma actual
  readonly unavailableAddons = computed(() => {
    const currentLang = this.preferences.selectedLanguage();
    return this.addonConfig.addons()
      .filter(addon => {
        const supportedLanguages = ADDON_LANGUAGE_SUPPORT[addon.name];
        return supportedLanguages && !supportedLanguages.includes(currentLang);
      })
      .map(addon => addon.name);
  });

  // Computed que obtiene estadísticas de disponibilidad de addons
  readonly addonStats = computed(() => {
    const total = this.addonConfig.addons().length;
    const available = this.filteredAddons().length;
    const unavailable = this.unavailableAddons().length;
    return { total, available, unavailable };
  });

  // Computed para opciones de idioma
  readonly languageOptions = computed(() =>
    Object.entries(LANGUAGES).map(([key, config]) => ({
      key: key as Language,
      config
    }))
  );

  constructor() {
    // Cargar preferencias guardadas
    this.loadPreferences();

    // Effect para guardar preferencias automáticamente
    effect(() => {
      this.savePreferences();
    });
  }

  /**
   * Establece el preset seleccionado
   */
  setSelectedPreset(preset: PresetType): void {
    this._selectedPreset.set(preset);
  }

  /**
   * Establece si se incluyen addons de anime
   */
  setIncludeAnimeAddons(include: boolean): void {
    this._includeAnimeAddons.set(include);
  }

  // Computed que filtra los addons del preset actual según el idioma seleccionado
  readonly effectivePresetAddonsFilteredByLanguage = computed(() => {
    const currentLang = this.preferences.selectedLanguage();
    const presetAddons = this.effectivePresetAddons();
    
    return presetAddons.filter(addon => {
      const supportedLanguages = ADDON_LANGUAGE_SUPPORT[addon.name];
      if (supportedLanguages) {
        return supportedLanguages.includes(currentLang);
      }
      return true;
    });
  });

  // Computed que obtiene los addons del preset NO disponibles en el idioma actual
  readonly unavailablePresetAddons = computed(() => {
    const currentLang = this.preferences.selectedLanguage();
    const presetAddons = this.effectivePresetAddons();
    
    return presetAddons
      .filter(addon => {
        const supportedLanguages = ADDON_LANGUAGE_SUPPORT[addon.name];
        return supportedLanguages && !supportedLanguages.includes(currentLang);
      })
      .map(addon => addon.name);
  });

  /**
   * Obtiene los nombres de los addons filtrados para el preset actual
   */
  getFilteredAddonNames(): string[] {
    return this.effectivePresetAddons().map(addon => addon.name);
  }

  /**
   * Verifica si un addon específico está incluido en el preset actual
   */
  isAddonIncluded(addonName: string): boolean {
    return this.getFilteredAddonNames().includes(addonName);
  }

  /**
   * Carga las preferencias desde localStorage
   */
  private loadPreferences(): void {
    // Cargar preset seleccionado
    const savedPreset = localStorage.getItem('selected-preset') as PresetType;
    if (savedPreset && savedPreset in ADDON_PRESETS) {
      this._selectedPreset.set(savedPreset);
    }

    // Cargar preferencia de addons de anime
    const savedAnimePreference = localStorage.getItem('include-anime-addons');
    if (savedAnimePreference !== null) {
      this._includeAnimeAddons.set(savedAnimePreference === 'true');
    }
  }

  /**
   * Guarda las preferencias en localStorage
   */
  private savePreferences(): void {
    localStorage.setItem('selected-preset', this._selectedPreset());
    localStorage.setItem('include-anime-addons', this._includeAnimeAddons().toString());
  }

  /**
   * Resetea las preferencias a valores por defecto
   */
  resetToDefaults(): void {
    this._selectedPreset.set('recommended');
    this._includeAnimeAddons.set(false);
  }

  /**
   * Método para recargar addons desde el dashboard (puede ser extendido según integración real)
   */
  refreshAddons(): void {
    // Aquí deberías notificar a los componentes que deben recargar los addons
    // Por ejemplo, usando un Subject, EventEmitter, o llamando a un servicio compartido
    // Por ahora, este método es un placeholder
    // Ejemplo: this.addonConfig.reloadAddons();
    // O emitir un evento global
    // Implementar según la arquitectura de la app
    console.log('Recarga de addons solicitada desde DashboardStateService');
  }
}