import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SessionService } from '../services/session.service';
import { GameStateService } from '../services/game-state.service';

/**
 * Guard that redirects to the landing page if there is no active session.
 * Ensures the game code in the URL matches the session's stored game code.
 * On page refresh, rehydrates game state from the backend via initFromSession().
 */
export const gameAuthGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const gameState = inject(GameStateService);

  const sess = session.get();
  if (!sess) {
    return router.parseUrl('/');
  }

  // Verify the URL code matches the session's game code
  const codeParam = route.paramMap.get('code');
  if (codeParam && codeParam.toUpperCase() !== sess.gameCode.toUpperCase()) {
    return router.parseUrl('/');
  }

  // If game state was lost (e.g. page refresh), rehydrate from the backend
  if (!gameState.isInitialised()) {
    const ok = await gameState.initFromSession();
    if (!ok) {
      return router.parseUrl('/');
    }
  }

  return true;
};
