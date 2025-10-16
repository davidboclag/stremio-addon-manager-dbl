import { Component, EventEmitter, Input, Output, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { StremioService } from '../../services/stremio.service';

@Component({
  selector: 'app-addons',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="card shadow-sm">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-puzzle me-2"></i>
          Addons Instalados
          <span class="badge bg-light text-primary ms-2">{{ addons().length }}</span>
        </h5>
        <div class="btn-group btn-group-sm">
          <button
            class="btn btn-outline-light"
            (click)="refreshAddons()"
            [disabled]="loading()"
            title="Recargar addons"
          >
            <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button
            class="btn btn-outline-light"
            (click)="exportConfig()"
            [disabled]="addons().length === 0"
            title="Exportar configuración"
          >
            <i class="bi bi-download"></i>
          </button>
          <label class="btn btn-outline-light mb-0" for="importFile" title="Importar configuración">
            <i class="bi bi-upload"></i>
          </label>
          <input
            type="file"
            id="importFile"
            class="d-none"
            accept=".json"
            (change)="importConfig($event)"
          />
          <button
            class="btn btn-outline-light"
            (click)="toggleView()"
            title="Cambiar vista"
          >
            <i class="bi" [class.bi-list]="viewMode() === 'grid'" [class.bi-grid]="viewMode() === 'list'"></i>
          </button>
        </div>
      </div>

      <div class="card-body">
        @if (!stremioAuthKey) {
          <div class="alert alert-warning border-0">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Debes iniciar sesión en Stremio para ver y gestionar los addons.
          </div>
        }

        @if (loading()) {
          <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando addons...</span>
            </div>
            <p class="mt-2 text-muted">Cargando addons desde Stremio...</p>
          </div>
        }

        @if (addons().length > 0 && !loading()) {
          <!-- Vista Lista -->
          @if (viewMode() === 'list') {
            <div 
              class="addon-list"
              cdkDropList 
              (cdkDropListDropped)="drop($event)"
            >
              @for (addon of addons(); track addon.transportUrl; let i = $index) {
                <div
                  class="addon-item"
                  cdkDrag
                  [attr.data-index]="i"
                >
                  <div class="addon-content">
                    <div class="addon-grip">
                      <i class="bi bi-grip-vertical"></i>
                    </div>
                    
                    <div class="addon-icon">
                      @if (addon?.manifest?.logo || addon?.manifest?.icon) {
                        <img
                          [src]="addon.manifest.logo || addon.manifest.icon"
                          [alt]="addon.manifest?.name || 'Addon'"
                          class="addon-logo"
                          (error)="onImageError($event)"
                        />
                      } @else {
                        <div class="addon-placeholder">
                          <i class="bi bi-puzzle"></i>
                        </div>
                      }
                    </div>

                    <div class="addon-info">
                      <h6 class="addon-name">{{ addon.manifest?.name || addon.transportName || 'Addon sin nombre' }}</h6>
                      <small class="addon-description text-muted">
                        {{ addon.manifest?.description || 'Sin descripción disponible' }}
                      </small>
                      @if (addon.manifest?.version) {
                        <span class="badge bg-secondary ms-2">v{{ addon.manifest.version }}</span>
                      }
                    </div>

                    <div class="addon-actions">
                      <button
                        class="btn btn-outline-primary btn-sm"
                        (click)="openAddon(addon.transportUrl)"
                        title="Abrir addon"
                      >
                        <i class="bi bi-box-arrow-up-right me-1"></i>
                        Abrir
                      </button>
                      <button
                        class="btn btn-outline-danger btn-sm ms-1"
                        (click)="deleteAddon(i, addon.manifest?.name || addon.transportName)"
                        title="Eliminar addon"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Preview del drag -->
                  <div *cdkDragPreview class="addon-drag-preview">
                    <div class="addon-preview-content">
                      <div class="addon-preview-icon">
                        @if (addon?.manifest?.logo || addon?.manifest?.icon) {
                          <img
                            [src]="addon.manifest.logo || addon.manifest.icon"
                            [alt]="addon.manifest?.name || 'Addon'"
                            class="addon-preview-logo"
                          />
                        } @else {
                          <div class="addon-preview-placeholder">
                            <i class="bi bi-puzzle"></i>
                          </div>
                        }
                      </div>
                      <div class="addon-preview-info">
                        <div class="addon-preview-name">{{ addon.manifest?.name || addon.transportName }}</div>
                        <div class="addon-preview-description">{{ addon.manifest?.description || 'Arrastrando addon...' }}</div>
                      </div>
                      <div class="addon-preview-grip">
                        <i class="bi bi-grip-vertical"></i>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Vista Grid -->
          @if (viewMode() === 'grid') {
            <div class="addon-grid">
              @for (addon of addons(); track addon.transportUrl; let i = $index) {
                <div class="addon-card">
                  <div class="addon-card-header">
                    @if (addon?.manifest?.logo || addon?.manifest?.icon) {
                      <img
                        [src]="addon.manifest.logo || addon.manifest.icon"
                        [alt]="addon.manifest?.name || 'Addon'"
                        class="addon-card-logo"
                        (error)="onImageError($event)"
                      />
                    } @else {
                      <div class="addon-card-placeholder">
                        <i class="bi bi-puzzle"></i>
                      </div>
                    }
                  </div>
                  <div class="addon-card-body">
                    <h6 class="addon-card-title">{{ addon.manifest?.name || addon.transportName }}</h6>
                    <p class="addon-card-text">{{ addon.manifest?.description }}</p>
                  </div>
                  <div class="addon-card-footer">
                    <button
                      class="btn btn-outline-primary btn-sm"
                      (click)="openAddon(addon.transportUrl)"
                    >
                      <i class="bi bi-box-arrow-up-right"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger btn-sm"
                      (click)="deleteAddon(i, addon.manifest?.name || addon.transportName)"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        } @else if (!loading() && stremioAuthKey) {
          <div class="empty-state text-center py-5">
            <i class="bi bi-puzzle display-1 text-muted mb-3"></i>
            <h5 class="text-muted">No hay addons instalados</h5>
            <p class="text-muted">Los addons que instales aparecerán aquí</p>
          </div>
        }

        <!-- Acciones principales -->
        @if (stremioAuthKey) {
          <div class="d-flex gap-2 flex-wrap mt-3 pt-3 border-top">
            <button
              class="btn btn-success"
              (click)="saveToStremio()"
              [disabled]="loading() || addons().length === 0"
            >
              @if (saving()) {
                <span class="spinner-border spinner-border-sm me-2"></span>
              }
              <i class="bi bi-cloud-upload me-1"></i>
              Sincronizar con Stremio
            </button>
            
            <button
              class="btn btn-outline-warning"
              (click)="deleteAll()"
              [disabled]="addons().length === 0"
            >
              <i class="bi bi-trash me-1"></i>
              Eliminar todos
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './addons.component.scss'
})
export class AddonsComponent implements OnInit {
  @Input() stremioAuthKey = '';
  @Input() rdToken = '';
  @Output() refreshRequested = new EventEmitter<void>();

  private readonly stremio = inject(StremioService);
  
  readonly addons = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly viewMode = signal<'list' | 'grid'>('list');

  constructor() {
    // Effect para cargar addons cuando cambia el authKey
    effect(() => {
      if (this.stremioAuthKey) {
        this.loadAddons();
      }
    });
  }

  ngOnInit(): void {
    // Cargar preferencia de vista del localStorage
    const savedView = localStorage.getItem('addons-view-mode') as 'list' | 'grid';
    if (savedView) {
      this.viewMode.set(savedView);
    }
  }

  async loadAddons(): Promise<void> {
    if (!this.stremioAuthKey) return;
    
    this.loading.set(true);
    try {
      const res = await this.stremio.getAddonCollection();
      if (res?.addons) {
        // Optimización: solo actualizar si hay cambios
        const currentAddons = this.addons();
        if (JSON.stringify(currentAddons) !== JSON.stringify(res.addons)) {
          this.addons.set(res.addons);
        }
      } else {
        this.addons.set([]);
      }
    } catch (err) {
      console.error('Error loading addons:', err);
      this.showError('Error al cargar addons. Verifica tu conexión y authKey.');
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
    localStorage.setItem('addons-view-mode', newMode);
  }

  openAddon(url: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  deleteAddon(index: number, name?: string): void {
    const addonName = name || `Addon #${index + 1}`;
    if (!confirm(`¿Eliminar "${addonName}"?`)) return;

    const currentAddons = [...this.addons()];
    currentAddons.splice(index, 1);
    this.addons.set(currentAddons);
    
    this.showSuccess(`"${addonName}" eliminado correctamente`);
  }

  deleteAll(): void {
    if (!confirm('¿Eliminar TODOS los addons? Esta acción no se puede deshacer.')) return;
    
    this.addons.set([]);
    this.showSuccess('Todos los addons han sido eliminados');
  }

  drop(event: CdkDragDrop<any[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    
    const currentAddons = [...this.addons()];
    moveItemInArray(currentAddons, event.previousIndex, event.currentIndex);
    this.addons.set(currentAddons);
  }

  async saveToStremio(): Promise<void> {
    this.saving.set(true);
    try {
      const result = await this.stremio.setAddonCollection(this.addons());
      if (result.success) {
        this.showSuccess('✅ Sincronizado correctamente con Stremio');
        this.refreshRequested.emit();
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('Error saving to Stremio:', err);
      this.showError('❌ Error al sincronizar con Stremio');
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

    const now = new Date();
    // Formato: DD-MM-YYYY_HH-MM
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `stremio-addons-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showSuccess('✅ Configuración exportada correctamente');
  }

  importConfig(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    if (file.type !== 'application/json') {
      this.showError('❌ Por favor selecciona un archivo JSON válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        
        // Validar estructura del archivo
        if (!config.addons || !Array.isArray(config.addons)) {
          throw new Error('Formato de archivo inválido: falta la propiedad "addons"');
        }

        // Validar que los addons tengan la estructura correcta
        const validAddons = config.addons.filter((addon: any) => 
          addon.transportUrl && (addon.manifest || addon.transportName)
        );

        if (validAddons.length === 0) {
          throw new Error('El archivo no contiene addons válidos');
        }

        // Preguntar si reemplazar o agregar
        const shouldReplace = validAddons.length > 0 && this.addons().length > 0
          ? confirm(`¿Deseas reemplazar los ${this.addons().length} addons actuales con los ${validAddons.length} addons del archivo?\n\nSelecciona "Cancelar" para agregar los addons sin eliminar los existentes.`)
          : true;

        if (shouldReplace === false) {
          // Agregar sin reemplazar
          const currentAddons = this.addons();
          const newAddons = [...currentAddons];
          
          validAddons.forEach((newAddon: any) => {
            // Evitar duplicados basándose en transportUrl
            if (!newAddons.some(existing => existing.transportUrl === newAddon.transportUrl)) {
              newAddons.push(newAddon);
            }
          });
          
          this.addons.set(newAddons);
          const addedCount = newAddons.length - currentAddons.length;
          this.showSuccess(`✅ Se agregaron ${addedCount} addons nuevos (${validAddons.length - addedCount} duplicados omitidos)`);
        } else if (shouldReplace !== null) {
          // Reemplazar completamente
          this.addons.set(validAddons);
          this.showSuccess(`✅ Configuración importada: ${validAddons.length} addons cargados`);
        }

        // Limpiar el input
        input.value = '';

      } catch (error) {
        console.error('Error importing config:', error);
        this.showError(`❌ Error al importar: ${error instanceof Error ? error.message : 'Archivo inválido'}`);
        input.value = '';
      }
    };

    reader.onerror = () => {
      this.showError('❌ Error al leer el archivo');
      input.value = '';
    };

    reader.readAsText(file);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="%23666" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>';
    }
  }

  private showSuccess(message: string): void {
    // Puedes implementar un toast service aquí
    console.log('Success:', message);
  }

  private showError(message: string): void {
    // Puedes implementar un toast service aquí
    console.error('Error:', message);
    alert(message);
  }
}
