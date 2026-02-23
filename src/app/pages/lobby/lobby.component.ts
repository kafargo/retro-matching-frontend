import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { GameStateService } from '../../core/services/game-state.service';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { PlayerSidebarComponent } from '../../shared/components/player-sidebar/player-sidebar.component';
import { GameCodeBadgeComponent } from '../../shared/components/game-code-badge/game-code-badge.component';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    PlayerSidebarComponent,
    GameCodeBadgeComponent,
  ],
  template: `
    <app-game-code-badge />

    <div class="page-container">
      <nav class="sidebar">
        <app-player-sidebar
          [players]="gameState.gameState()?.players ?? []"
          [phase]="'lobby'"
        />
      </nav>

      <main class="main-content">
        <h2>Waiting for players to join...</h2>
        <p style="opacity:0.6;">
          Share the game code <strong>{{ gameState.gameCode() }}</strong> with your team.
        </p>

        @if (gameState.isCreator()) {
          <mat-card style="max-width:400px;margin-top:24px;">
            <mat-card-content>
              <p>When everyone has joined, click <strong>Start Game</strong> to begin the card creation phase.</p>
              <p style="opacity:0.6;font-size:0.85rem;">No additional players can join once the game starts.</p>
            </mat-card-content>
            <mat-card-actions>
              <button
                mat-flat-button
                color="primary"
                (click)="onStartGame()"
                [disabled]="isLoading()"
              >
                @if (isLoading()) {
                  <mat-spinner diameter="20" style="display:inline-block;vertical-align:middle;"></mat-spinner>
                } @else {
                  Start Game
                }
              </button>
            </mat-card-actions>
          </mat-card>
        } @else {
          <p style="opacity:0.5;margin-top:24px;">Waiting for the creator to start the game...</p>
        }
      </main>
    </div>
  `,
})
export class LobbyComponent {
  readonly gameState = inject(GameStateService);
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly snack = inject(MatSnackBar);

  readonly isLoading = signal(false);

  async onStartGame(): Promise<void> {
    const sess = this.session.get();
    if (!sess) return;
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.api.startGame(sess.gameCode, sess.sessionToken));
      // Navigation is handled by GameStateService effect on phase change
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to start game.', 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }
}
