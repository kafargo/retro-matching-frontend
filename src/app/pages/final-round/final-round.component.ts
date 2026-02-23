import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { GameStateService } from '../../core/services/game-state.service';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { PlayerSidebarComponent } from '../../shared/components/player-sidebar/player-sidebar.component';
import { GameCodeBadgeComponent } from '../../shared/components/game-code-badge/game-code-badge.component';
import { RevealedSubmission } from '../../core/models/game.model';

const CARD_TYPE_COLORS: Record<string, string> = {
  start: '#4caf50',
  stop: '#f44336',
  continue: '#2196f3',
};

@Component({
  selector: 'app-final-round',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
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
          [phase]="'final_round'"
          [submissionStatus]="currentRound()?.submission_status ?? []"
        />
      </nav>

      <main class="main-content">
        @if (currentRound()) {
          <div class="adjective-banner">
            Final Round — Most <span style="color:#ffd700;">{{ currentRound()!.adjective }}</span>
          </div>
          <p style="opacity:0.6;text-align:center;margin-bottom:24px;">
            Everyone votes! The card with the most votes wins a point.
          </p>

          @if (!hasVoted()) {
            <h3 style="text-align:center;">Choose the most {{ currentRound()!.adjective }} card:</h3>
            <div class="card-grid" style="margin-top:16px;">
              @for (sub of currentRound()!.revealed_submissions ?? []; track sub.submission_id) {
                <mat-card>
                  <mat-card-header>
                    <mat-card-subtitle [style.color]="cardTypeColor(sub.card_type)">
                      {{ sub.card_type | titlecase }}
                    </mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p style="font-size:1rem;line-height:1.5;">{{ sub.card_text }}</p>
                  </mat-card-content>
                  <mat-card-actions>
                    <button
                      mat-flat-button
                      color="primary"
                      [disabled]="isLoading()"
                      (click)="onVote(sub)"
                    >
                      Vote
                    </button>
                  </mat-card-actions>
                </mat-card>
              }
            </div>
          } @else {
            <p style="text-align:center;opacity:0.7;margin-top:32px;">
              <mat-icon style="vertical-align:middle;margin-right:8px;">how_to_vote</mat-icon>
              Vote cast! Waiting for all votes to come in...
            </p>
            <div class="card-grid" style="margin-top:24px;">
              @for (sub of currentRound()!.revealed_submissions ?? []; track sub.submission_id) {
                <mat-card [style.opacity]="votedCardId() === sub.card_id ? '1' : '0.5'">
                  <mat-card-header>
                    <mat-card-subtitle [style.color]="cardTypeColor(sub.card_type)">
                      {{ sub.card_type | titlecase }}
                      @if (votedCardId() === sub.card_id) {
                        <mat-icon style="font-size:14px;vertical-align:middle;color:#ffd700;margin-left:4px;">how_to_vote</mat-icon>
                      }
                    </mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p>{{ sub.card_text }}</p>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          }
        }
      </main>
    </div>
  `,
})
export class FinalRoundComponent {
  readonly gameState = inject(GameStateService);
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly snack = inject(MatSnackBar);

  readonly isLoading = signal(false);
  readonly hasVoted = signal(false);
  readonly votedCardId = signal<number | null>(null);

  readonly currentRound = computed(() => this.gameState.gameState()?.current_round ?? null);

  cardTypeColor(type: string): string {
    return CARD_TYPE_COLORS[type] ?? '#ffffff';
  }

  async onVote(sub: RevealedSubmission): Promise<void> {
    const sess = this.session.get();
    const round = this.currentRound();
    if (!sess || !round) return;

    this.isLoading.set(true);
    try {
      await firstValueFrom(this.api.vote(sess.gameCode, round.id, sub.card_id, sess.sessionToken));
      this.hasVoted.set(true);
      this.votedCardId.set(sub.card_id);
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to vote.', 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }
}
