import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgClass } from '@angular/common';

export interface ToastMessage {
	message: string;
	type: 'success' | 'error';
	id: number;
}

@Component({
	selector: 'app-toast',
	standalone: true,
	imports: [CommonModule, NgClass],
	template: `
		<div style="position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); z-index: 9999; min-width: 220px; max-width: 90vw; display: flex; flex-direction: column; gap: 0.5rem; pointer-events: none;">
			<div *ngFor="let toast of toasts()" class="alert" [ngClass]="{
				'alert-success': toast.type === 'success',
				'alert-danger': toast.type === 'error',
				'show': true
			}" role="alert" style="pointer-events: auto; cursor: pointer; opacity: 0.97;" (click)="remove(toast.id)">
				<span>{{ toast.message }}</span>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent {
	private static _instance: ToastComponent | null = null;
	private _id = 0;
	readonly toasts = signal<ToastMessage[]>([]);

	constructor() {
		ToastComponent._instance = this;
	}

	static show(message: string, type: 'success' | 'error' = 'success', duration = 3500) {
		ToastComponent._instance?.add(message, type, duration);
	}

	add(message: string, type: 'success' | 'error', duration: number) {
		const id = ++this._id;
		this.toasts.update(list => [...list, { message, type, id }]);
		setTimeout(() => this.remove(id), duration);
	}

	remove(id: number) {
		this.toasts.update(list => list.filter(t => t.id !== id));
	}
}
