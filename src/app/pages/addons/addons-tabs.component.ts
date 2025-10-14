import { Component, Input, OnInit } from '@angular/core';
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
export class AddonTabsComponent implements OnInit {
  @Input() addons: Addon[] = [];
  @Input() token: string = '';

  activeIndex: number | null = null;
  iframeUrls: (SafeResourceUrl | null)[] = [];
  loading = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    // Activar el primer tab automáticamente
    if (this.addons.length) this.selectTab(0);
  }

  async selectTab(idx: number) {
    const addon = this.addons[idx];
    if (!addon || addon.hideTab) return;

    this.activeIndex = idx;
    this.loading = true;

    let url = await this.resolveUrl(addon);
    if (!url) {
      this.loading = false;
      return;
    }

    this.iframeUrls[idx] = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  async resolveUrl(addon: Addon): Promise<string | null> {
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

  async updateIframes() {
    // Actualiza iframes dependientes del token
    for (let i = 0; i < this.addons.length; i++) {
      const addon = this.addons[i];
      if (!addon) continue;
      if (addon.requiresToken && !this.token) continue;

      if (typeof addon.getUrl === 'function') {
        let url = addon.getUrl(this.token);
        if (url instanceof Promise) url = await url;
        this.iframeUrls[i] = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      }
    }
  }

  onIframeLoaded() {
    this.loading = false;
  }
}
