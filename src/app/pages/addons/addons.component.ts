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
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { StremioService, StremioAddon } from '../../services/stremio.service';

@Component({
  selector: 'app-addons',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDropList],
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
  
  readonly addons = signal<StremioAddon[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly viewMode = signal<'list' | 'grid'>('list');

  constructor() {
    // Effect para cargar addons cuando cambia el authKey
    effect(() => {
      if (this.stremioAuthKey()) {
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
    if (!this.stremioAuthKey()) return;
    
    this.loading.set(true);
    try {
      const res = await this.stremio.getAddonCollection();
      this.addons.set(res?.addons || []);
    } catch (err) {
      console.error('Error loading addons:', err);
      this.showError('Error al cargar addons. Verifica tu conexión.');
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
        
        if (!config.addons || !Array.isArray(config.addons)) {
          throw new Error('Formato de archivo inválido');
        }

        const validAddons = config.addons.filter((addon: any) => 
          addon.transportUrl && (addon.manifest || addon.transportName)
        );

        if (validAddons.length === 0) {
          throw new Error('El archivo no contiene addons válidos');
        }

        this.addons.set(validAddons);
        this.showSuccess(`✅ Configuración importada: ${validAddons.length} addons cargados`);
        input.value = '';

      } catch (error) {
        console.error('Error importing config:', error);
        this.showError(`❌ Error al importar: ${error instanceof Error ? error.message : 'Archivo inválido'}`);
        input.value = '';
      }
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
    console.log('Success:', message);
  }

  private showError(message: string): void {
    console.error('Error:', message);
    alert(message);
  }
}
