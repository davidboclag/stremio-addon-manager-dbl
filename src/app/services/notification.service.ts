import { Injectable } from '@angular/core';
import { ToastComponent } from '../shared/components/toast/toast.component';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  success(message: string): void {
    ToastComponent.show(message, 'success');
  }

  error(message: string): void {
    ToastComponent.show(message, 'error');
  }
}
