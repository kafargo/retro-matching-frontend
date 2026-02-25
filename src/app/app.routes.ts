import { Routes } from '@angular/router';
import { gameAuthGuard } from './core/guards/game-auth.guard';
import { phaseGuard } from './core/guards/phase.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'game/:code',
    canActivate: [gameAuthGuard],
    children: [
      {
        path: 'lobby',
        canActivate: [phaseGuard('lobby')],
        loadComponent: () =>
          import('./pages/lobby/lobby.component').then((m) => m.LobbyComponent),
      },
      {
        path: 'card-creation',
        canActivate: [phaseGuard('card_creation')],
        loadComponent: () =>
          import('./pages/card-creation/card-creation.component').then(
            (m) => m.CardCreationComponent
          ),
      },
      {
        path: 'playing',
        canActivate: [phaseGuard('playing')],
        loadComponent: () =>
          import('./pages/playing/playing.component').then((m) => m.PlayingComponent),
      },
      {
        path: 'finished',
        canActivate: [phaseGuard('finished')],
        loadComponent: () =>
          import('./pages/finished/finished.component').then((m) => m.FinishedComponent),
      },
      { path: '', redirectTo: 'lobby', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
