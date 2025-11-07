import {
  Component,
  EventEmitter,
  output,
  input,
  inject,
  signal,
  effect,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { StremioService, StremioAddon } from '../../services/stremio.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-addons',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDropList, TranslateModule],
  templateUrl: './addons.component.html',
  styleUrl: './addons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddonsComponent implements OnInit {
  // Input y Output signals
  readonly stremioAuthKey = input<string>('');
  readonly rdToken = input<string>('');
  readonly refreshRequested = output<void>();

  private readonly stremio = inject(StremioService);
  private readonly translate = inject(TranslateService);

  readonly addons = signal<StremioAddon[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly viewMode = signal<'list' | 'grid'>('list');

  constructor(private notification: NotificationService) {
    // Effect para cargar addons cuando cambia el authKey
    effect(() => {
      if (this.stremioAuthKey()) {
        this.loadAddons();
      }
    });
  }

  ngOnInit(): void {
    // Cargar preferencia de vista del localStorage usando un método dedicado
    const savedView = this.getViewModeFromStorage();
    if (savedView) {
      this.viewMode.set(savedView);
    }
  }

  private getViewModeFromStorage(): 'list' | 'grid' | null {
    const mode = localStorage.getItem('addons-view-mode');
    return mode === 'list' || mode === 'grid' ? mode : null;
  }

  private setViewModeToStorage(mode: 'list' | 'grid'): void {
    localStorage.setItem('addons-view-mode', mode);
  }

  async loadAddons(): Promise<void> {
    if (!this.stremioAuthKey()) return;

    this.loading.set(true);
    try {
      const res = await this.stremio.getAddonCollection();
      this.addons.set(res?.addons || []);
    } catch (err) {
      console.error('Error loading addons:', err);
      this.notification.error(this.translate.instant('MESSAGES.ADDON_LOAD_ERROR'));
      this.addons.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  refreshAddons(): void {
    this.loadAddons();
  }

  toggleView(): void {
    const newMode = this.viewMode() === 'list' ? 'grid' : 'list';
    this.viewMode.set(newMode);
    this.setViewModeToStorage(newMode);
  }

  openAddon(url: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  deleteAddon(index: number, name?: string): void {
    const addonName = name || `Addon #${index + 1}`;
    if (!confirm(this.translate.instant('MESSAGES.CONFIRM_DELETE_ADDON', { name: addonName }))) return;

    const currentAddons = [...this.addons()];
    currentAddons.splice(index, 1);
    this.addons.set(currentAddons);

    this.notification.success(this.translate.instant('MESSAGES.ADDON_DELETED', { name: addonName }));
  }

  deleteAll(): void {
    if (!confirm(this.translate.instant('MESSAGES.CONFIRM_DELETE_ALL'))) return;

    this.addons.set([]);
    this.notification.success(this.translate.instant('MESSAGES.ALL_ADDONS_DELETED'));
  }

  // CDK Drag & Drop - Simple como antes
  drop(event: CdkDragDrop<StremioAddon[]>): void {
    moveItemInArray(this.addons(), event.previousIndex, event.currentIndex);
    this.addons.set([...this.addons()]);
  }

  async saveToStremio(): Promise<void> {
    this.saving.set(true);
    try {
      const result = await this.stremio.setAddonCollection(this.addons());
      if (result.success) {
        this.notification.success(this.translate.instant('MESSAGES.SYNC_SUCCESS'));
        this.refreshRequested.emit();
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('Error saving to Stremio:', err);
      this.notification.error(this.translate.instant('MESSAGES.SYNC_ERROR'));
    } finally {
      this.saving.set(false);
    }
  }

  exportConfig(): void {
    const config = {
      addons: this.addons(),
      exportDate: new Date().toISOString(),
      version: '1.0',
      appName: 'Stremio Addon Manager'
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `stremio-addons-${dateStr}.json`;
      a.click();
      this.notification.success(this.translate.instant('MESSAGES.EXPORT_SUCCESS'));
    } finally {
      // Siempre limpiar el recurso
      URL.revokeObjectURL(url);
    }
  }

  async importConfig(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.type !== 'application/json') {
      this.notification.error(this.translate.instant('MESSAGES.IMPORT_FILE_ERROR'));
      return;
    }
    try {
      const content = await file.text();
      const config: { addons?: unknown[] } = JSON.parse(content);
      if (!Array.isArray(config.addons)) {
        throw new Error('Formato de archivo inválido');
      }
      // Validar que cada addon tenga los campos mínimos requeridos
      const validAddons = config.addons.filter((addon: any) =>
        addon && typeof addon === 'object' && addon.transportUrl && (addon.manifest || addon.transportName)
      );
      if (validAddons.length === 0) {
        throw new Error('El archivo no contiene addons válidos');
      }
      this.addons.set(validAddons as StremioAddon[]);
      this.notification.success(`✅ Configuración importada: ${validAddons.length} addons cargados`);
      input.value = '';
    } catch (error) {
      console.error('Error importing config:', error);
      this.notification.error(this.translate.instant('MESSAGES.IMPORT_ERROR', {
        error: error instanceof Error ? (error as Error).message : 'Archivo inválido'
      }));
      input.value = '';
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      // Imagen de error accesible
      img.alt = 'Imagen no disponible';
      img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="%23666" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>';
    }
  }

  // ...showSuccess/showError eliminados, usar NotificationService
}
