import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { GameStateService } from '../services/game-state.service';
import { GamePhase } from '../models/game.model';

const PHASE_TO_ROUTE: Record<GamePhase, string> = {
  lobby: 'lobby',
  card_creation: 'card-creation',
  playing: 'playing',
  finished: 'finished',
};

/**
 * Factory guard that checks the current game phase and redirects to the correct
 * sub-route if the player tries to access the wrong phase page.
 *
 * @param requiredPhase The phase that this route requires.
 */
export const phaseGuard = (requiredPhase: GamePhase): CanActivateFn => {
  return (route: ActivatedRouteSnapshot) => {
    const gameState = inject(GameStateService);
    const router = inject(Router);

    const phase = gameState.currentPhase();
    const code = route.paramMap.get('code') ?? gameState.gameCode();

    if (!phase || !code) {
      // Game state not yet initialised — allow through and let component handle it
      return true;
    }

    if (phase === requiredPhase) {
      return true;
    }

    // Redirect to the correct phase route
    const correctRoute = PHASE_TO_ROUTE[phase];
    return router.parseUrl(`/game/${code}/${correctRoute}`);
  };
};
