import { Component, inject, signal, computed, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { DebridService } from '../../services/debrid.service';
import { PreferencesService, Language } from '../../services/preferences.service';
import { TranslateModule } from '@ngx-translate/core';

interface Addon {
  name: string;
  hideTab?: boolean;
  requiresToken?: boolean;
  url?: string;
  getUrl?: (token?: string, language?: string) => string | Promise<string>;
}

@Component({
  selector: 'app-addon-tabs',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './addons-tabs.component.html',
})
export class AddonTabsComponent {
  // Input signals para mayor reactividad
  readonly addons = input<Addon[]>([]);
  readonly token = input<string>('');
  readonly language = input<Language>('spanish');

  private readonly sanitizer = inject(DomSanitizer);
  private readonly debridService = inject(DebridService);
  private readonly preferences = inject(PreferencesService);

  readonly activeAddonName = signal<string | null>(null);
  readonly iframeUrls = signal<Map<string, SafeResourceUrl>>(new Map());
  readonly loading = signal(false);

  // Computed para obtener addons visibles (sin hideTab)
  readonly visibleAddons = computed(() =>
    this.addons().filter(addon => !addon.hideTab)
  );

  // Computed para obtener el índice activo basado en el nombre del addon
  readonly activeIndex = computed(() => {
    const activeAddon = this.activeAddonName();
    if (!activeAddon) return null;
    return this.visibleAddons().findIndex(addon => addon.name === activeAddon);
  });

  // Computed para verificar si el token es válido
  readonly hasValidToken = computed(() => this.debridService.isValidToken());

  constructor() {
    // Effect para activar el primer tab cuando cambien los addons
    effect(() => {
      const visible = this.visibleAddons();
      const currentActive = this.activeAddonName();

      // Si no hay addon activo o el activo ya no está visible, seleccionar el primero
      if (visible.length > 0 && (!currentActive || !visible.some(addon => addon.name === currentActive))) {
        this.selectTab(0);
      }
    });

    // Effect consolidado para actualizar iframe cuando cambien factores relevantes
    effect(() => {
      const token = this.token();
      const language = this.language();
      const debridToken = this.debridService.token();
      const selectedProvider = this.debridService.selectedProvider();
      const activeAddon = this.activeAddonName();

      // Recargar iframe activo cuando cambie cualquier factor relevante
      if (activeAddon !== null) {
        this.updateActiveIframe();
      }
    });

    // Effect para reaccionar a cambios en el servicio de preferencias
    effect(() => {
      const currentLang = this.preferences.selectedLanguage();
      if (this.activeAddonName() !== null) {
        this.updateActiveIframe();
      }
    });
  }

  async selectTab(idx: number): Promise<void> {
    const visibleAddons = this.visibleAddons();
    const addon = visibleAddons[idx];
    if (!addon) return;

    this.activeAddonName.set(addon.name);
    this.loading.set(true);

    try {
      const url = await this.resolveUrl(addon);
      if (url) {
        const currentUrls = this.iframeUrls();
        currentUrls.set(addon.name, this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.iframeUrls.set(new Map(currentUrls));
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async updateActiveIframe(): Promise<void> {
    const activeAddonName = this.activeAddonName();
    if (activeAddonName === null) return;

    const visibleAddons = this.visibleAddons();
    const addon = visibleAddons.find(a => a.name === activeAddonName);
    if (!addon) return;

    this.loading.set(true);

    try {
      const url = await this.resolveUrl(addon);
      if (url) {
        const currentUrls = this.iframeUrls();
        currentUrls.set(addon.name, this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.iframeUrls.set(new Map(currentUrls));
      }
    } catch (error) {
      console.error('❌ Error al actualizar iframe:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async resolveUrl(addon: Addon): Promise<string | null> {
    if (typeof addon.url === 'string') return addon.url;

    if (typeof addon.getUrl === 'function') {
      // Verificar si requiere token válido
      if (addon.requiresToken && !this.hasValidToken()) {
        const currentService = this.debridService.currentService();
        const serviceName = currentService?.displayName || 'un servicio debrid';
        alert(`⚠️ Este addon requiere un token de ${serviceName} válido.`);
        return null;
      }

      // Para addons gratuitos (requiresToken: false), pasar token solo si es válido
      // Para addons premium (requiresToken: true), pasar token obligatorio
      const shouldPassToken = addon.requiresToken || this.hasValidToken();
      const validToken = shouldPassToken ? (this.debridService.token() || undefined) : undefined;
      const currentLanguage = this.preferences.selectedLanguage();

      let url = addon.getUrl(validToken, currentLanguage);
      if (url instanceof Promise) url = await url;
      return url;
    }

    return null;
  }

  onIframeLoaded(): void {
    this.loading.set(false);
  }
}
