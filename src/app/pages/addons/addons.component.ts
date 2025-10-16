import { Component, EventEmitter, Input, Output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { StremioService } from '../../services/stremio.service';

@Component({
  selector: 'app-addons',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './addons.component.html',
  styleUrl: './addons.component.scss'
})
export class AddonsComponent {
  @Input() stremioAuthKey = '';
  @Input() rdToken = '';
  @Output() refreshRequested = new EventEmitter<void>();

  private readonly stremio = inject(StremioService);
  
  readonly addons = signal<any[]>([]);
  readonly loading = signal(false);

  constructor() {
    // Effect para cargar addons cuando cambia el authKey
    effect(() => {
      if (this.stremioAuthKey) {
        this.loadAddons();
      }
    });
  }

  async loadAddons(): Promise<void> {
    if (!this.stremioAuthKey) return;
    
    this.loading.set(true);
    try {
      const res = await this.stremio.getAddonCollection();
      if (res?.addons) {
        this.addons.set(res.addons);
      } else {
        this.addons.set([]);
      }
    } catch (err) {
      console.error(err);
      alert('Error al cargar addons (CORS o authKey inválida).');
      this.addons.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  openAddon(url: string): void {
    window.open(url, '_blank');
  }

  deleteAddon(index: number, name?: string): void {
    const confirmMsg = name ? `¿Eliminar addon "${name}"?` : '¿Eliminar addon?';
    if (!confirm(confirmMsg)) return;

    const currentAddons = this.addons();
    currentAddons.splice(index, 1);
    this.addons.set([...currentAddons]);
  }

  deleteAll(): void {
    if (!confirm('¿Eliminar TODOS los addons?')) return;
    this.addons.set([]);
  }

  drop(event: CdkDragDrop<any[]>): void {
    const currentAddons = [...this.addons()];
    moveItemInArray(currentAddons, event.previousIndex, event.currentIndex);
    this.addons.set(currentAddons);
  }

  async saveToStremio(): Promise<void> {
    try {
      const result = await this.stremio.setAddonCollection(this.addons());
      if (result.success) {
        alert('✅ Sincronizado con Stremio');
        this.refreshRequested.emit();
      } else {
        alert('❌ Error al sincronizar con Stremio');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Error de conexión al sincronizar con Stremio');
    }
  }
}
