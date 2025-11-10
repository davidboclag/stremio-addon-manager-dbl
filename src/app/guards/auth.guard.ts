import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { StremioService } from '../services/stremio.service';

export const authGuard = () => {
  const stremio = inject(StremioService);
  const router = inject(Router);

  if (stremio.isAuthenticated()) {
    // Renovar la expiración ya que el usuario está accediendo a una ruta protegida
    stremio.renewSessionExpiration();
    return true;
  }

  return router.createUrlTree(['/']);
};