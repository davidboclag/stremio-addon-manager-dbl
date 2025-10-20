import { Component, inject, signal, computed, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { DebridService } from '../../services/debrid.service';
import { PreferencesService, Language } from '../../services/preferences.service';

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
  imports: [CommonModule, FormsModule],
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

  readonly activeIndex = signal<number | null>(null);
  readonly iframeUrls = signal<(SafeResourceUrl | null)[]>([]);
  readonly loading = signal(false);

  // Computed para obtener addons visibles (sin hideTab)
  readonly visibleAddons = computed(() => 
    this.addons().filter(addon => !addon.hideTab)
  );

  // Computed para verificar si el token es válido
  readonly hasValidToken = computed(() => this.debridService.isValidToken());

  constructor() {
    // Effect para activar el primer tab cuando cambien los addons
    effect(() => {
      const visible = this.visibleAddons();
      if (visible.length > 0 && this.activeIndex() === null) {
        this.selectTab(0);
      }
    });

    // Effect consolidado para actualizar iframe cuando cambien factores relevantes
    effect(() => {
      const token = this.token();
      const language = this.language();
      const debridToken = this.debridService.token();
      const selectedProvider = this.debridService.selectedProvider();
      const activeIdx = this.activeIndex();
      
      // Recargar iframe activo cuando cambie cualquier factor relevante
      if (activeIdx !== null) {
        this.updateActiveIframe();
      }
    });

    // Effect para reaccionar a cambios en el servicio de preferencias
    effect(() => {
      const currentLang = this.preferences.selectedLanguage();
      if (this.activeIndex() !== null) {
        this.updateActiveIframe();
      }
    });
  }

  async selectTab(idx: number): Promise<void> {
    const visibleAddons = this.visibleAddons();
    const addon = visibleAddons[idx];
    if (!addon) return;

    this.activeIndex.set(idx);
    this.loading.set(true);

    try {
      const url = await this.resolveUrl(addon);
      if (url) {
        const currentUrls = this.iframeUrls();
        currentUrls[idx] = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.iframeUrls.set([...currentUrls]);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async updateActiveIframe(): Promise<void> {
    const activeIdx = this.activeIndex();
    if (activeIdx === null) return;

    const visibleAddons = this.visibleAddons();
    const addon = visibleAddons[activeIdx];
    if (!addon) return;

    this.loading.set(true);

    try {
      const url = await this.resolveUrl(addon);
      if (url) {
        const currentUrls = this.iframeUrls();
        currentUrls[activeIdx] = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.iframeUrls.set([...currentUrls]);
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
