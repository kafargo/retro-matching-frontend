import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * Guard that redirects to the landing page if there is no active session.
 * Ensures the game code in the URL matches the session's stored game code.
 */
export const gameAuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const session = inject(SessionService);
  const router = inject(Router);

  const sess = session.get();
  if (!sess) {
    return router.parseUrl('/');
  }

  // Verify the URL code matches the session's game code
  const codeParam = route.paramMap.get('code');
  if (codeParam && codeParam.toUpperCase() !== sess.gameCode.toUpperCase()) {
    return router.parseUrl('/');
  }

  return true;
};
