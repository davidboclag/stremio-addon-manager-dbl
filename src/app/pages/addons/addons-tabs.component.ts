import { Component, Input, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

interface Addon {
  name: string;
  hideTab?: boolean;
  requiresToken?: boolean;
  url?: string;
  getUrl?: (token?: string) => string | Promise<string>;
}

@Component({
  selector: 'app-addon-tabs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './addons-tabs.component.html',
})
export class AddonTabsComponent {
  @Input() addons: Addon[] = [];
  @Input() token: string = '';

  private readonly sanitizer = inject(DomSanitizer);

  readonly activeIndex = signal<number | null>(null);
  readonly iframeUrls = signal<(SafeResourceUrl | null)[]>([]);
  readonly loading = signal(false);

  // Computed para obtener addons visibles (sin hideTab)
  readonly visibleAddons = computed(() => 
    this.addons.filter(addon => !addon.hideTab)
  );

  constructor() {
    // Effect para activar el primer tab cuando cambien los addons
    effect(() => {
      const visible = this.visibleAddons();
      if (visible.length > 0 && this.activeIndex() === null) {
        this.selectTab(0);
      }
    });

    // Effect para actualizar iframes cuando cambie el token
    effect(() => {
      if (this.token) {
        this.updateIframes();
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

  private async resolveUrl(addon: Addon): Promise<string | null> {
    if (typeof addon.url === 'string') return addon.url;

    if (typeof addon.getUrl === 'function') {
      if (addon.requiresToken && !this.token) {
        alert('⚠️ Debes ingresar tu token de Real-Debrid.');
        return null;
      }
      let url = addon.getUrl(this.token);
      if (url instanceof Promise) url = await url;
      return url;
    }

    return null;
  }

  private async updateIframes(): Promise<void> {
    const visibleAddons = this.visibleAddons();
    const newUrls: (SafeResourceUrl | null)[] = [];

    for (let i = 0; i < visibleAddons.length; i++) {
      const addon = visibleAddons[i];
      if (!addon) continue;
      
      if (addon.requiresToken && !this.token) continue;

      if (typeof addon.getUrl === 'function') {
        try {
          let url = addon.getUrl(this.token);
          if (url instanceof Promise) url = await url;
          if (url) {
            newUrls[i] = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          }
        } catch (error) {
          console.error('Error updating iframe for addon:', addon.name, error);
        }
      }
    }

    this.iframeUrls.set(newUrls);
  }

  onIframeLoaded(): void {
    this.loading.set(false);
  }
}
