import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { GameStateService } from '../../core/services/game-state.service';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { GameCodeBadgeComponent } from '../../shared/components/game-code-badge/game-code-badge.component';

@Component({
  selector: 'app-finished',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    GameCodeBadgeComponent,
  ],
  template: `
    <app-game-code-badge />

    <div class="full-center finished-page">
      <header class="finished-header">
        <h1>Game Over!</h1>
        <p>Final Scores</p>
      </header>

      <mat-card class="score-card">
        <mat-card-content>
          @for (player of sortedPlayers(); track player.id; let i = $index) {
            <div class="score-row">
              <span class="rank">
                {{ i + 1 }}
              </span>
              @if (i === 0) {
                <mat-icon class="trophy gold">emoji_events</mat-icon>
              } @else if (i === 1) {
                <mat-icon class="trophy silver">emoji_events</mat-icon>
              } @else if (i === 2) {
                <mat-icon class="trophy bronze">emoji_events</mat-icon>
              } @else {
                <span class="trophy-spacer"></span>
              }
              <span class="player-name">{{ player.display_name }}</span>
              <span class="score">{{ player.score }}</span>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <div class="finished-actions">
        <button mat-stroked-button (click)="onLeave()">Leave Game</button>
        @if (gameState.isCreator()) {
          <button
            mat-flat-button
            color="warn"
            (click)="onFinishGame()"
            [disabled]="isLoading()"
          >
            @if (isLoading()) {
              <mat-spinner diameter="20" class="inline-spinner"></mat-spinner>
            } @else {
              End &amp; Delete Game
            }
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .finished-page {
      text-align: center;
    }

    .finished-header {
      margin-bottom: 32px;
    }

    .finished-header h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 8vw, 2.5rem);
      font-weight: 900;
      line-height: 1.05;
    }

    .finished-header p {
      margin: 0;
      color: var(--muted-text);
    }

    .score-card {
      width: min(100%, 480px);
      min-width: 0;
      text-align: left;
    }

    .score-card mat-card-content {
      padding: 16px;
    }

    .score-row {
      display: grid;
      grid-template-columns: 32px 24px minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .score-row:last-child {
      border-bottom: 0;
    }

    .rank {
      width: 32px;
      text-align: center;
      font-size: 1.3rem;
      font-weight: 700;
      opacity: 0.5;
    }

    .trophy-spacer {
      width: 24px;
      height: 24px;
    }

    .gold {
      color: #ffd700;
    }

    .silver {
      color: #c0c0c0;
    }

    .bronze {
      color: #cd7f32;
    }

    .player-name {
      min-width: 0;
      font-size: 1.1rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .score {
      font-size: 1.4rem;
      font-weight: 700;
      color: #ffd700;
    }

    .finished-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
      width: min(100%, 480px);
      margin-top: 32px;
    }

    .inline-spinner {
      display: inline-block;
      vertical-align: middle;
    }

    @media (max-width: 420px) {
      .score-card mat-card-content {
        padding: 12px;
      }

      .score-row {
        grid-template-columns: 28px 24px minmax(0, 1fr) auto;
        gap: 8px;
      }

      .rank {
        width: 28px;
        font-size: 1.1rem;
      }

      .player-name {
        font-size: 1rem;
      }

      .score {
        font-size: 1.2rem;
      }

      .finished-actions button {
        flex: 1 1 150px;
      }
    }
  `],
})
export class FinishedComponent {
  readonly gameState = inject(GameStateService);
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly isLoading = signal(false);

  get sortedPlayers() {
    return () => {
      const players = (this.gameState.gameState()?.players ?? []).filter((p) => p.role === 'player');
      return [...players].sort((a, b) => b.score - a.score);
    };
  }

  async onFinishGame(): Promise<void> {
    const sess = this.session.get();
    if (!sess) return;
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.api.finishGame(sess.gameCode, sess.sessionToken));
      this.gameState.reset();
      this.router.navigate(['/']);
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to finish game.', 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  onLeave(): void {
    this.gameState.reset();
    this.router.navigate(['/']);
  }
}
