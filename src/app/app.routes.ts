
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'addons',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/addons/addons.component').then(m => m.AddonsComponent)
  },
  { path: '**', redirectTo: '' }
];
