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
import { Card } from '../../core/models/card.model';
import { RevealedSubmission } from '../../core/models/game.model';

const CARD_TYPE_COLORS: Record<string, string> = {
  start: '#4caf50',
  stop: '#f44336',
  continue: '#2196f3',
};

@Component({
  selector: 'app-playing',
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
          [phase]="'playing'"
          [submissionStatus]="currentRound()?.submission_status ?? []"
          [judgeId]="currentRound()?.judge_id ?? null"
        />
      </nav>

      <main class="main-content">
        @if (currentRound()) {
          <div class="adjective-banner">
            Round {{ currentRound()!.round_number }} — Be the most
            <span style="color:#ffd700;"> {{ currentRound()!.adjective }}</span>
          </div>

          @if (gameState.isJudge()) {
            <div style="text-align:center;margin-bottom:16px;">
              <mat-icon style="font-size:36px;color:#ffd700;vertical-align:middle;">star</mat-icon>
              <span style="font-size:1.2rem;font-weight:700;margin-left:8px;">You are the Judge this round</span>
            </div>

            @if (currentRound()!.phase === 'submitting') {
              <p style="opacity:0.6;text-align:center;">Waiting for all players to submit their cards...</p>
            }

            @if (currentRound()!.phase === 'revealed' && currentRound()!.revealed_submissions) {
              <h3 style="text-align:center;margin-bottom:16px;">Pick the most {{ currentRound()!.adjective }} card:</h3>
              <div class="card-grid">
                @for (sub of currentRound()!.revealed_submissions!; track sub.submission_id) {
                  <mat-card style="cursor:pointer;transition:transform 0.15s;" (click)="onPickWinner(sub.submission_id)">
                    <mat-card-header>
                      <mat-card-subtitle [style.color]="cardTypeColor(sub.card_type)">
                        {{ sub.card_type | titlecase }}
                      </mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <p style="font-size:1rem;line-height:1.5;">{{ sub.card_text }}</p>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-flat-button color="primary" [disabled]="isLoading()">
                        Pick This Card
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }
          } @else if (gameState.isSpectator()) {
            <p style="opacity:0.6;text-align:center;margin-top:32px;">
              You are spectating. Watching the round unfold...
            </p>
            @if (currentRound()!.phase === 'revealed' && currentRound()!.revealed_submissions) {
              <div class="card-grid" style="margin-top:24px;">
                @for (sub of currentRound()!.revealed_submissions!; track sub.submission_id) {
                  <mat-card>
                    <mat-card-header>
                      <mat-card-subtitle [style.color]="cardTypeColor(sub.card_type)">
                        {{ sub.card_type | titlecase }}
                      </mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <p>{{ sub.card_text }}</p>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            }
          } @else {
            @if (currentRound()!.phase === 'submitting' && !hasSubmittedThisRound()) {
              <h3 style="margin-bottom:16px;">Choose a card to play:</h3>
              <div class="card-grid">
                @for (card of gameState.myCards(); track card.id) {
                  <mat-card style="cursor:pointer;" (click)="onPlayCard(card)">
                    <mat-card-header>
                      <mat-card-subtitle [style.color]="cardTypeColor(card.card_type)">
                        {{ card.card_type | titlecase }}
                      </mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <p style="font-size:1rem;line-height:1.5;">{{ card.text }}</p>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-flat-button color="accent" [disabled]="isLoading()">Play</button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }

            @if (currentRound()!.phase === 'submitting' && hasSubmittedThisRound()) {
              <p style="opacity:0.6;text-align:center;margin-top:32px;">
                Card submitted! Waiting for others...
              </p>
            }

            @if (currentRound()!.phase === 'revealed') {
              <h3 style="text-align:center;margin-bottom:16px;">Cards revealed — judge is picking a winner...</h3>
              <div class="card-grid">
                @for (sub of currentRound()!.revealed_submissions!; track sub.submission_id) {
                  <mat-card>
                    <mat-card-header>
                      <mat-card-subtitle [style.color]="cardTypeColor(sub.card_type)">
                        {{ sub.card_type | titlecase }}
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

          @if (currentRound()!.winner_id) {
            <div style="text-align:center;margin-top:24px;padding:16px;background:rgba(255,215,0,0.1);border-radius:8px;">
              <mat-icon style="color:#ffd700;vertical-align:middle;">emoji_events</mat-icon>
              <span style="font-weight:700;margin-left:8px;">
                {{ winnerName() }} wins this round!
              </span>
            </div>
          }
        }
      </main>
    </div>
  `,
})
export class PlayingComponent {
  readonly gameState = inject(GameStateService);
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly snack = inject(MatSnackBar);

  readonly isLoading = signal(false);
  readonly submittedRoundId = signal<number | null>(null);

  readonly currentRound = computed(() => this.gameState.gameState()?.current_round ?? null);

  readonly hasSubmittedThisRound = computed(() => {
    const roundId = this.currentRound()?.id;
    return roundId != null && this.submittedRoundId() === roundId;
  });

  readonly winnerName = computed(() => {
    const winnerId = this.currentRound()?.winner_id;
    if (!winnerId) return null;
    return this.gameState.gameState()?.players.find((p) => p.id === winnerId)?.display_name ?? null;
  });

  cardTypeColor(type: string): string {
    return CARD_TYPE_COLORS[type] ?? '#ffffff';
  }

  async onPlayCard(card: Card): Promise<void> {
    const sess = this.session.get();
    const round = this.currentRound();
    if (!sess || !round) return;
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.api.submitCard(sess.gameCode, round.id, card.id, sess.sessionToken));
      this.submittedRoundId.set(round.id);
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to play card.', 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onPickWinner(submissionId: number): Promise<void> {
    const sess = this.session.get();
    const round = this.currentRound();
    if (!sess || !round) return;
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.api.pickWinner(sess.gameCode, round.id, submissionId, sess.sessionToken));
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to pick winner.', 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }
}
