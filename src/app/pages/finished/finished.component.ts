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

    <div class="full-center">
      <h1 style="font-size:2.5rem;font-weight:900;margin-bottom:8px;">Game Over!</h1>
      <p style="opacity:0.6;margin-bottom:32px;">Final Scores</p>

      <mat-card style="min-width:320px;max-width:480px;width:100%;">
        <mat-card-content style="padding:16px;">
          @for (player of sortedPlayers(); track player.id; let i = $index) {
            <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="font-size:1.3rem;font-weight:700;width:32px;text-align:center;opacity:0.5;">
                {{ i + 1 }}
              </span>
              @if (i === 0) {
                <mat-icon style="color:#ffd700;">emoji_events</mat-icon>
              } @else if (i === 1) {
                <mat-icon style="color:#c0c0c0;">emoji_events</mat-icon>
              } @else if (i === 2) {
                <mat-icon style="color:#cd7f32;">emoji_events</mat-icon>
              } @else {
                <span style="width:24px;"></span>
              }
              <span style="flex:1;font-size:1.1rem;">{{ player.display_name }}</span>
              <span style="font-size:1.4rem;font-weight:700;color:#ffd700;">{{ player.score }}</span>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <div style="margin-top:32px;display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
        <button mat-stroked-button (click)="onLeave()">Leave Game</button>
        @if (gameState.isCreator()) {
          <button
            mat-flat-button
            color="warn"
            (click)="onFinishGame()"
            [disabled]="isLoading()"
          >
            @if (isLoading()) {
              <mat-spinner diameter="20" style="display:inline-block;vertical-align:middle;"></mat-spinner>
            } @else {
              End &amp; Delete Game
            }
          </button>
        }
      </div>
    </div>
  `,
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
