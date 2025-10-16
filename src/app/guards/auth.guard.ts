import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { StremioService } from '../services/stremio.service';

export const authGuard = () => {
  const stremio = inject(StremioService);
  const router = inject(Router);

  if (stremio.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/']);
};