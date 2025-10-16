import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<div class="container py-4"><router-outlet></router-outlet></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {}
