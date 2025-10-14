import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
export class AddonsComponent implements OnInit {
  @Input() stremioAuthKey = '';
  @Input() rdToken = '';
  @Output() refreshRequested = new EventEmitter<void>();

  addons: any[] = [];

  constructor(private stremio: StremioService) {}

  async ngOnInit() {
    if (this.stremioAuthKey) {
      await this.loadAddons();
    }
  }

  async loadAddons() {
    try {
      const res: any = await this.stremio.getAddonCollection(this.stremioAuthKey);
      if (res?.result?.addons) {
        this.addons = res.result.addons;
      } else {
        this.addons = [];
      }
    } catch (err) {
      console.error(err);
      alert('Error al cargar addons (CORS o authKey inválida).');
    }
  }

  openAddon(url: string) {
    // en el original abría iframes; aquí abrimos en nueva pestaña
    window.open(url, '_blank');
  }

  deleteAddon(index: number) {
    if (!confirm('¿Eliminar addon?')) return;
    this.addons.splice(index, 1);
  }

  deleteAll() {
    if (!confirm('¿Eliminar TODOS los addons?')) return;
    this.addons = [];
  }

  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.addons, event.previousIndex, event.currentIndex);
  }

  async saveToStremio() {
    const payload = { type: 'AddonCollectionSet', authKey: this.stremioAuthKey, addons: this.addons };
    try {
      const res = await this.stremio.setAddonCollection(payload);
      if (res?.result?.success) {
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
