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
          [voteStatus]="currentRound()?.vote_status ?? []"
          [roundPhase]="currentRound()?.phase ?? 'submitting'"
        />
      </nav>

      <main class="main-content">
        @if (currentRound()) {
          <div class="adjective-banner">
            Round {{ currentRound()!.round_number }} of {{ currentRound()!.total_rounds }}
            — Be the most
            <span style="color:#ffd700;"> {{ currentRound()!.adjective }}</span>
          </div>

          <!-- === SUBMITTING PHASE === -->
          @if (currentRound()!.phase === 'submitting') {
            @if (gameState.isSpectator()) {
              <p style="opacity:0.6;text-align:center;margin-top:32px;">
                You are spectating. Waiting for all players to submit their cards...
              </p>
            } @else if (!hasSubmittedThisRound()) {
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
            } @else {
              <p style="opacity:0.6;text-align:center;margin-top:32px;">
                Card submitted! Waiting for others...
              </p>
            }
          }

          <!-- === VOTING PHASE === -->
          @if (currentRound()!.phase === 'voting') {
            @if (gameState.isSpectator()) {
              <p style="opacity:0.6;text-align:center;margin-top:16px;">
                Spectating — players are voting...
              </p>
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
                  </mat-card>
                }
              </div>
            } @else if (!hasVotedThisRound()) {
              <h3 style="text-align:center;margin-bottom:16px;">
                Vote for the most <span style="color:#ffd700;">{{ currentRound()!.adjective }}</span> card:
              </h3>
              <div class="card-grid">
                @for (sub of currentRound()!.revealed_submissions ?? []; track sub.submission_id) {
                  <mat-card style="cursor:pointer;transition:transform 0.15s;" (click)="onVote(sub)">
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

          <!-- === COMPLETE PHASE — show winner(s) === -->
          @if (currentRound()!.phase === 'complete') {
            <div style="text-align:center;margin-bottom:24px;padding:16px;background:rgba(255,215,0,0.1);border-radius:8px;">
              <mat-icon style="color:#ffd700;vertical-align:middle;font-size:36px;">emoji_events</mat-icon>
              <div style="font-weight:700;font-size:1.3rem;margin-top:8px;">
                @if (winnerNames().length === 1) {
                  {{ winnerNames()[0] }} wins this round!
                } @else if (winnerNames().length > 1) {
                  It's a tie! {{ winnerNames().join(' & ') }} each earn a point!
                } @else {
                  No votes were cast this round.
                }
              </div>
            </div>

            <div class="card-grid">
              @for (sub of currentRound()!.revealed_submissions ?? []; track sub.submission_id) {
                <mat-card [class.winning-card]="isWinningCard(sub.card_id)"
                          [style.opacity]="isWinningCard(sub.card_id) ? '1' : '0.4'">
                  <mat-card-header>
                    <mat-card-subtitle [style.color]="cardTypeColor(sub.card_type)">
                      {{ sub.card_type | titlecase }}
                      @if (isWinningCard(sub.card_id)) {
                        <mat-icon style="font-size:16px;vertical-align:middle;color:#ffd700;margin-left:4px;">emoji_events</mat-icon>
                      }
                    </mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p style="font-size:1rem;line-height:1.5;">{{ sub.card_text }}</p>
                  </mat-card-content>
                </mat-card>
              }
            </div>

            @if (gameState.isCreator()) {
              <div style="text-align:center;margin-top:32px;">
                <button
                  mat-flat-button
                  color="primary"
                  (click)="onAdvanceRound()"
                  [disabled]="isLoading()"
                  style="font-size:1.1rem;padding:8px 32px;"
                >
                  @if (isLoading()) {
                    <mat-spinner diameter="20" style="display:inline-block;vertical-align:middle;"></mat-spinner>
                  } @else if (isLastRound()) {
                    Show Final Results
                  } @else {
                    Next Round
                  }
                </button>
              </div>
            } @else {
              <p style="text-align:center;opacity:0.5;margin-top:24px;">
                Waiting for the host to
                @if (isLastRound()) {
                  show final results...
                } @else {
                  start the next round...
                }
              </p>
            }
          }
        }
      </main>
    </div>
  `,
  styles: [`
    .winning-card {
      border: 2px solid #ffd700 !important;
      box-shadow: 0 0 16px rgba(255, 215, 0, 0.3);
    }
  `],
})
export class PlayingComponent {
  readonly gameState = inject(GameStateService);
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly snack = inject(MatSnackBar);

  readonly isLoading = signal(false);
  readonly submittedRoundId = signal<number | null>(null);
  readonly votedRoundId = signal<number | null>(null);
  readonly votedCardId = signal<number | null>(null);

  readonly currentRound = computed(() => this.gameState.gameState()?.current_round ?? null);

  readonly hasSubmittedThisRound = computed(() => {
    const roundId = this.currentRound()?.id;
    // Optimistic local check
    if (roundId != null && this.submittedRoundId() === roundId) return true;
    // Server truth check
    const status = this.currentRound()?.submission_status;
    const myId = this.gameState.myPlayer()?.id;
    if (!status || !myId) return false;
    return status.some(s => s.player_id === myId && s.has_submitted);
  });

  readonly hasVotedThisRound = computed(() => {
    const roundId = this.currentRound()?.id;
    // Optimistic local check
    if (roundId != null && this.votedRoundId() === roundId) return true;
    // Server truth check
    const voteStatus = this.currentRound()?.vote_status;
    const myId = this.gameState.myPlayer()?.id;
    if (!voteStatus || !myId) return false;
    return voteStatus.some(s => s.player_id === myId && s.has_voted);
  });

  readonly winnerNames = computed(() => {
    const winnerIds = this.currentRound()?.winner_player_ids ?? [];
    if (!winnerIds.length) return [];
    const players = this.gameState.gameState()?.players ?? [];
    return winnerIds
      .map(id => players.find(p => p.id === id)?.display_name)
      .filter((name): name is string => !!name);
  });

  readonly isLastRound = computed(() => {
    const round = this.currentRound();
    if (!round) return false;
    return round.round_number >= round.total_rounds;
  });

  cardTypeColor(type: string): string {
    return CARD_TYPE_COLORS[type] ?? '#ffffff';
  }

  isWinningCard(cardId: number): boolean {
    return (this.currentRound()?.winning_card_ids ?? []).includes(cardId);
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

  async onVote(sub: RevealedSubmission): Promise<void> {
    const sess = this.session.get();
    const round = this.currentRound();
    if (!sess || !round) return;
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.api.vote(sess.gameCode, round.id, sub.card_id, sess.sessionToken));
      this.votedRoundId.set(round.id);
      this.votedCardId.set(sub.card_id);
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to vote.', 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onAdvanceRound(): Promise<void> {
    const sess = this.session.get();
    const round = this.currentRound();
    if (!sess || !round) return;
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.api.advanceRound(sess.gameCode, round.id, sess.sessionToken));
      // Navigation handled by GameStateService effect on phase/round change
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to advance round.', 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }
}
