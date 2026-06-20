import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { GameStateService } from '../../core/services/game-state.service';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { PlayerSidebarComponent } from '../../shared/components/player-sidebar/player-sidebar.component';
import { GameCodeBadgeComponent } from '../../shared/components/game-code-badge/game-code-badge.component';
import { RulesDialogComponent } from './rules-dialog.component';

interface CardGroup {
  type: 'start' | 'stop' | 'continue';
  label: string;
  description: string;
  color: string;
}

const CARD_GROUPS: CardGroup[] = [
  { type: 'start', label: 'Start', description: 'Things we should start doing', color: '#4caf50' },
  { type: 'stop', label: 'Stop', description: 'Things we should stop doing', color: '#f44336' },
  { type: 'continue', label: 'Continue', description: 'Things we should keep doing', color: '#2196f3' },
];

@Component({
  selector: 'app-card-creation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatIconModule,
    PlayerSidebarComponent,
    GameCodeBadgeComponent,
  ],
  template: `
    <app-game-code-badge />

    <div class="page-container">
      <nav class="sidebar">
        <app-player-sidebar
          [players]="gameState.gameState()?.players ?? []"
          [phase]="'card_creation'"
          [canRemove]="gameState.isCreator()"
          [creatorId]="gameState.gameState()?.creator_id ?? null"
          (removePlayer)="onRemovePlayer($event)"
        />
      </nav>

      <main class="main-content">
        @if (gameState.isCreator()) {
          <mat-card class="share-card">
            <mat-card-content>
              <mat-icon class="share-icon">groups</mat-icon>
              <div class="share-copy">
                <div class="share-label">
                  Share this game code so others can join
                </div>
                <div class="share-code">
                  {{ gameState.gameCode() }}
                </div>
              </div>
              <button mat-flat-button color="primary" type="button" (click)="onCopyGameCode()" [disabled]="!gameState.gameCode()">
                <mat-icon class="button-icon">
                  {{ codeCopied() ? 'check' : 'content_copy' }}
                </mat-icon>
                {{ codeCopied() ? 'Copied!' : 'Copy code' }}
              </button>
            </mat-card-content>
          </mat-card>
          @if (!disconnectNoteDismissed()) {
            <mat-card class="notice-card">
              <mat-card-content>
                <mat-icon>info</mat-icon>
                <span>
                  <strong>Note:</strong> if a player disconnects, they can reconnect at anytime using their same username and game code. The game cannot start with disconnected players!
                </span>
                <button
                  mat-icon-button
                  type="button"
                  class="notice-close"
                  aria-label="Dismiss disconnect note"
                  (click)="disconnectNoteDismissed.set(true)"
                >
                  <mat-icon>close</mat-icon>
                </button>
              </mat-card-content>
            </mat-card>
          }
        } @else {
          @if (!disconnectNoteDismissed()) {
            <mat-card class="notice-card">
              <mat-card-content>
                <mat-icon>info</mat-icon>
                <span>
                  <strong>Note:</strong> if you disconnect, you can reconnect at any time using the same name and game code.
                </span>
                <button
                  mat-icon-button
                  type="button"
                  class="notice-close"
                  aria-label="Dismiss disconnect note"
                  (click)="disconnectNoteDismissed.set(true)"
                >
                  <mat-icon>close</mat-icon>
                </button>
              </mat-card-content>
            </mat-card>
          }
        }
        @if (gameState.isSpectator()) {
          <h2>Card Creation Phase</h2>
          <p class="muted-copy">You are a spectator. Waiting for all players to complete their cards...</p>
          @if (gameState.isCreator() && allPlayersReady()) {
            <button mat-flat-button color="primary" (click)="onBeginGame()" [disabled]="isLoading()">
              Begin Game
            </button>
          }
        } @else if (isSubmitted()) {
          <h2>Cards Submitted!</h2>
          <p class="muted-copy">Waiting for other players to complete their cards...</p>
          @if (gameState.isCreator() && allPlayersReady()) {
            <mat-card class="ready-card">
              <mat-card-content>All players are ready!</mat-card-content>
              <mat-card-actions>
                <button mat-flat-button color="primary" (click)="onBeginGame()" [disabled]="isLoading()">
                  Begin Game
                </button>
              </mat-card-actions>
            </mat-card>
          }
        } @else {
          <h2>Create Your Cards</h2>
          <p class="muted-copy">Fill in 2 cards for each category, then click Submit.</p>

          <form class="cards-form" [formGroup]="cardsForm" (ngSubmit)="onSubmitCards()">
            @for (group of cardGroups; track group.type) {
              <div class="card-group">
                <h3 [style.color]="group.color">
                  {{ group.label }} — {{ group.description }}
                </h3>
                <div class="card-fields">
                  @for (i of [0,1]; track i) {
                    <mat-form-field appearance="outline">
                      <mat-label>{{ group.label }} #{{ i + 1 }}</mat-label>
                      <input matInput
                             [formControl]="getControl(group.type, i)"
                             maxlength="500"
                             [placeholder]="'Describe something to ' + group.label.toLowerCase() + '...'" />
                      <mat-error>Card text is required</mat-error>
                    </mat-form-field>
                  }
                </div>
              </div>
            }

            <button mat-flat-button color="primary" type="submit" [disabled]="isLoading()">
              @if (isLoading()) {
                <mat-spinner diameter="20" class="inline-spinner"></mat-spinner>
              } @else {
                Submit Cards
              }
            </button>
          </form>
        }
      </main>
    </div>
  `,
  styles: [`
    .share-card,
    .notice-card {
      width: min(100%, 640px);
      margin-bottom: 16px;
    }

    .share-card {
      background: linear-gradient(135deg, rgba(76,175,80,0.16), rgba(76,175,80,0.06)) !important;
      border-left: 3px solid #4caf50 !important;
    }

    .share-card mat-card-content {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 14px 18px;
      flex-wrap: wrap;
    }

    .share-icon {
      color: #4caf50;
      flex-shrink: 0;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .share-copy {
      flex: 1 1 220px;
      min-width: 0;
    }

    .share-label {
      margin-bottom: 2px;
      color: var(--muted-text);
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .share-code {
      color: #4caf50;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: clamp(1.35rem, 8vw, 1.9rem);
      font-weight: 700;
      letter-spacing: clamp(0.08em, 2vw, 0.18em);
      overflow-wrap: normal;
      word-break: keep-all;
    }

    .button-icon {
      margin-right: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
      vertical-align: middle;
    }

    .notice-card {
      margin-bottom: 20px;
      background: rgba(33,150,243,0.08) !important;
      border-left: 3px solid #2196f3 !important;
    }

    .notice-card mat-card-content {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px 16px;
    }

    .notice-card mat-icon {
      color: #2196f3;
      flex-shrink: 0;
    }

    .notice-card span {
      flex: 1;
      min-width: 0;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .notice-close {
      flex: 0 0 auto;
      width: 36px;
      height: 36px;
      min-height: 36px;
      margin: -6px -8px -6px 2px;
    }

    .notice-close mat-icon {
      color: rgba(224, 224, 224, 0.72);
    }

    .muted-copy {
      color: var(--muted-text);
    }

    .ready-card {
      width: min(100%, 400px);
      margin-top: 16px;
    }

    .cards-form {
      width: min(100%, 640px);
    }

    .card-group {
      margin-bottom: 28px;
    }

    .card-group h3 {
      margin: 0 0 4px;
      line-height: 1.25;
    }

    .card-fields {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .card-fields mat-form-field {
      width: 100%;
    }

    .inline-spinner {
      display: inline-block;
      vertical-align: middle;
    }

    @media (max-width: 760px) {
      .share-card mat-card-content {
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
      }

      .share-card button {
        width: 100%;
      }

      .notice-card mat-card-content {
        padding: 12px;
      }
    }
  `],
})
export class CardCreationComponent {
  readonly gameState = inject(GameStateService);
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  readonly cardGroups = CARD_GROUPS;
  readonly isLoading = signal(false);
  readonly isSubmitted = signal(false);
  readonly codeCopied = signal(false);
  readonly disconnectNoteDismissed = signal(false);

  constructor() {
    // Show the rules modal once per game per browser session. The dialog can
    // only be dismissed by clicking "Let's create cards" (disableClose: true).
    const code = this.session.get()?.gameCode;
    const seenKey = code ? `rules_seen_${code}` : null;
    let alreadySeen = false;
    try {
      alreadySeen = seenKey ? sessionStorage.getItem(seenKey) === '1' : false;
    } catch {}
    if (!alreadySeen) {
      this.dialog.open(RulesDialogComponent, {
        disableClose: true,
        width: '600px',
        maxWidth: '90vw',
        autoFocus: 'dialog',
      });
      if (seenKey) {
        try { sessionStorage.setItem(seenKey, '1'); } catch {}
      }
    }
  }

  readonly cardsForm = this.fb.group({
    start_0: ['', [Validators.required, Validators.maxLength(500)]],
    start_1: ['', [Validators.required, Validators.maxLength(500)]],
    stop_0: ['', [Validators.required, Validators.maxLength(500)]],
    stop_1: ['', [Validators.required, Validators.maxLength(500)]],
    continue_0: ['', [Validators.required, Validators.maxLength(500)]],
    continue_1: ['', [Validators.required, Validators.maxLength(500)]],
  });

  getControl(type: string, index: number) {
    const key = `${type}_${index}` as keyof typeof this.cardsForm.controls;
    return this.cardsForm.controls[key];
  }

  allPlayersReady(): boolean {
    const players = this.gameState.gameState()?.players ?? [];
    // Mirror the backend /begin gate: only connected non-spectator players count,
    // and we need at least 2 of them so a single connected player can't start alone.
    const connected = players.filter((p) => p.role === 'player' && p.is_connected);
    return connected.length >= 2 && connected.every((p) => p.is_ready);
  }

  async onSubmitCards(): Promise<void> {
    if (this.cardsForm.invalid) {
      this.cardsForm.markAllAsTouched();
      return;
    }
    const sess = this.session.get();
    if (!sess) return;
    this.isLoading.set(true);

    try {
      const v = this.cardsForm.value;
      const cards = [
        { card_type: 'start', text: v.start_0! },
        { card_type: 'start', text: v.start_1! },
        { card_type: 'stop', text: v.stop_0! },
        { card_type: 'stop', text: v.stop_1! },
        { card_type: 'continue', text: v.continue_0! },
        { card_type: 'continue', text: v.continue_1! },
      ];

      await firstValueFrom(this.api.submitCards(sess.gameCode, sess.sessionToken, cards));
      await firstValueFrom(this.api.markReady(sess.gameCode, sess.sessionToken));
      this.isSubmitted.set(true);
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to submit cards.', 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onBeginGame(): Promise<void> {
    const sess = this.session.get();
    if (!sess) return;
    if (!confirm('Begin the game? Once started, no new players will be able to join.')) {
      return;
    }
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.api.beginGame(sess.gameCode, sess.sessionToken));
      // Navigation handled by GameStateService effect
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to begin game.', 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onCopyGameCode(): Promise<void> {
    const code = this.gameState.gameCode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    } catch {
      this.snack.open(`Couldn't copy automatically — game code: ${code}`, 'Dismiss', { duration: 5000 });
    }
  }

  async onRemovePlayer(playerId: number): Promise<void> {
    const sess = this.session.get();
    if (!sess) return;
    const players = this.gameState.gameState()?.players ?? [];
    const target = players.find((p) => p.id === playerId);
    const name = target?.display_name ?? 'this player';
    if (!confirm(`Remove ${name} from the game? They will be sent back to the home screen.`)) {
      return;
    }
    try {
      await firstValueFrom(this.api.removePlayer(sess.gameCode, playerId, sess.sessionToken));
      // Roster will refresh via game_state_updated broadcast.
    } catch (err: any) {
      this.snack.open(err?.error?.message ?? 'Failed to remove player.', 'Dismiss', { duration: 4000 });
    }
  }
}
