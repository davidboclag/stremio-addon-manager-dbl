import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { StremioService } from '../services/stremio.service';

/**
 * Guard que redirige automáticamente al dashboard si el usuario ya está autenticado.
 * Se usa en rutas como "/" (login) para evitar que usuarios autenticados vean la pantalla de login.
 */
export const loginGuard = () => {
  const stremio = inject(StremioService);
  const router = inject(Router);

  // Si el usuario ya está autenticado, renovar sesión y redirigir al dashboard
  if (stremio.isAuthenticated()) {
    // Renovar la expiración ya que el usuario está activo
    stremio.renewSessionExpiration();
    return router.createUrlTree(['/dashboard']);
  }

  // Si no está autenticado, permitir acceso a la página de login
  return true;
};