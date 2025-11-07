import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { StremioService } from './stremio.service';
import { DebridService } from './debrid.service';
import { PreferencesService } from './preferences.service';
import { AddonConfigService } from './addon-config.service';
import { 
  AddonPreset, 
  PresetType, 
  ADDON_PRESETS,
  Addon 
} from '../types/addon-configs';
import { StremioAddon } from './stremio.service';

export interface InstallationProgress {
  isLoading: boolean;
  title: string;
  message: string;
  currentStep: number;
  totalSteps: number;
}

export interface InstallationResult {
  success: boolean;
  error?: string;
  installedAddons?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AddonInstallationService {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);
  private readonly stremio = inject(StremioService);
  private readonly debridService = inject(DebridService);
  private readonly preferences = inject(PreferencesService);
  private readonly addonConfig = inject(AddonConfigService);

  // Estado de la instalación
  private readonly _progress = signal<InstallationProgress>({
    isLoading: false,
    title: '',
    message: '',
    currentStep: 0,
    totalSteps: 0
  });

  readonly progress = this._progress.asReadonly();

  /**
   * Instala un preset de addons
   */
  async installPreset(
    presetType: PresetType, 
    includeAnimeAddons: boolean = false,
    includeCinemeta: boolean = true
  ): Promise<InstallationResult> {
    const preset = ADDON_PRESETS[presetType];

    // Validaciones previas
    const validationResult = this.validateInstallation(preset);
    if (!validationResult.success) {
      return validationResult;
    }

    // Obtener addons efectivos para instalar
    const addonsToInstall = this.addonConfig.getEffectiveAddons(
      preset.addonNames, 
      includeAnimeAddons,
      includeCinemeta
    );

    // Iniciar proceso de instalación
    this.startInstallation(preset.name, addonsToInstall.length);

    try {
  const finalJson: StremioAddon[] = [];
      const token = this.debridService.token()?.trim();
      const language = this.preferences.selectedLanguage();

      for (let i = 0; i < addonsToInstall.length; i++) {
        const addon = addonsToInstall[i];
        
        this.updateProgress(
          i + 1, 
          this.translate.instant('INSTALLATION.PROCESSING', { name: addon.name })
        );

        const addonData = await this.processAddon(addon, token, language);
        if (addonData) {
          finalJson.push(addonData);
        }
      }

      this.updateProgress(
        addonsToInstall.length + 1,
        this.translate.instant('INSTALLATION.SENDING_CONFIG')
      );

      const result = await this.stremio.setAddonCollection(finalJson);

      if (result.success) {
        this.updateProgress(
          addonsToInstall.length + 1,
          this.translate.instant('INSTALLATION.CONFIG_COMPLETED')
        );
        
        setTimeout(() => this.finishInstallation(), 2000);

        return { 
          success: true, 
          installedAddons: finalJson.length 
        };
      } else {
        throw new Error(result.error || 'Error desconocido');
      }

    } catch (error) {
      console.error('Error en installPreset:', error);
      this.updateProgress(
        0,
        this.translate.instant('INSTALLATION.CONFIG_ERROR')
      );
      
      setTimeout(() => this.finishInstallation(), 500);

      return { 
        success: false, 
        error: error instanceof Error ? error.message : this.translate.instant('INSTALLATION.UNKNOWN_ERROR')
      };
    }
  }

  /**
   * Resetea Stremio a la configuración de fábrica
   */
  async resetStremio(): Promise<InstallationResult> {
    if (!this.stremio.isAuthenticated()) {
      return { 
        success: false, 
        error: this.translate.instant('INSTALLATION.LOGIN_REQUIRED')
      };
    }

    this.startInstallation('INSTALLATION.RESETTING_STREMIO', 2);

    try {
      this.updateProgress(1, this.translate.instant('INSTALLATION.LOADING_FACTORY_CONFIG'));

      const fileContent = await this.http
        .get<{ addons: StremioAddon[] }>('/assets/reset-stremio.json')
        .toPromise();
      if (!fileContent || !Array.isArray(fileContent.addons)) {
        throw new Error(this.translate.instant('INSTALLATION.FACTORY_CONFIG_LOAD_ERROR'));
      }

      this.updateProgress(2, this.translate.instant('INSTALLATION.SENDING_FACTORY_CONFIG'));

      const result = await this.stremio.setAddonCollection(fileContent.addons || []);

      if (result.success) {
        this.updateProgress(2, this.translate.instant('INSTALLATION.STREMIO_RESET_SUCCESS'));
        setTimeout(() => this.finishInstallation(), 1500);
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error resetting Stremio:', error);
      this.updateProgress(0, this.translate.instant('INSTALLATION.STREMIO_RESET_ERROR'));
      setTimeout(() => this.finishInstallation(), 500);
      
      return { 
        success: false, 
        error: this.translate.instant('INSTALLATION.STREMIO_RESET_CONNECTION_ERROR')
      };
    }
  }

  /**
   * Valida si se puede realizar la instalación
   */
  private validateInstallation(preset: AddonPreset): InstallationResult {
    if (!this.stremio.isAuthenticated()) {
      return { 
        success: false, 
        error: this.translate.instant('INSTALLATION.LOGIN_REQUIRED_WARNING')
      };
    }

    const token = this.debridService.token()?.trim();
    if (preset.requiresToken && (!token || !this.debridService.validateTokenFormat(token))) {
      const currentService = this.debridService.currentService();
      const serviceName = currentService?.displayName || this.translate.instant('INSTALLATION.DEBRID_SERVICE');
      return {
        success: false,
        error: this.translate.instant('INSTALLATION.TOKEN_REQUIRED', { 
          presetName: this.translate.instant(preset.name), 
          serviceName: serviceName 
        })
      };
    }
    return { success: true };
  }

  /**
   * Procesa un addon individual
   */
  private async processAddon(
    addon: Addon, 
    token?: string, 
    language?: string
  ): Promise<StremioAddon | null> {
    try {
      const url = await this.addonConfig.resolveAddonUrl(addon, token, language);
      if (!url) return null;

      const manifest = await this.fetchManifest(url);
      // Validar que manifest tiene al menos id y name
      if (!manifest || typeof manifest !== 'object' || !('id' in manifest) || !('name' in manifest)) return null;

      const isOfficial = ['cinemeta', 'watchhub'].includes(
        addon.name?.toLowerCase() || ''
      );
      const flags = { official: isOfficial, protected: isOfficial };

      return {
        transportUrl: url,
        transportName: addon.transportName || addon.name,
        manifest: manifest as any, // Se asume AddonManifest, validado arriba
        flags
      };
    } catch (error) {
      console.error(`Error processing addon ${addon.name}:`, error);
      return null;
    }
  }

  /**
   * Obtiene el manifest de un addon
   */
  private async fetchManifest(url: string): Promise<object | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching manifest:', url, error);
      return { error: 'Failed to fetch manifest' };
    }
  }

  /**
   * Inicia el proceso de instalación
   */
  private startInstallation(title: string, totalSteps: number): void {
    this._progress.set({
      isLoading: true,
      title,
      message: this.translate.instant('INSTALLATION.PREPARING'),
      currentStep: 0,
      totalSteps: totalSteps + 1 // +1 para el paso final de envío a Stremio
    });
  }

  /**
   * Actualiza el progreso de la instalación
   */
  private updateProgress(currentStep: number, message: string): void {
    this._progress.update(progress => ({
      ...progress,
      currentStep,
      message
    }));
  }

  /**
   * Finaliza el proceso de instalación
   */
  private finishInstallation(): void {
    this._progress.update(progress => ({
      ...progress,
      isLoading: false
    }));
  }

  /**
   * Obtiene información sobre un preset
   */
  getPresetInfo(presetType: PresetType): AddonPreset {
    return ADDON_PRESETS[presetType];
  }

  /**
   * Obtiene todos los presets disponibles
   */
  getAvailablePresets(): AddonPreset[] {
    return Object.values(ADDON_PRESETS);
  }

  /**
   * Verifica si un preset se puede instalar con la configuración actual
   */
  canInstallPreset(presetType: PresetType): boolean {
    const preset = ADDON_PRESETS[presetType];
    const token = this.debridService.token()?.trim();
    return this.stremio.isAuthenticated() && 
      (!preset.requiresToken || (!!token && this.debridService.validateTokenFormat(token)));
  }
}