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
          <mat-card style="max-width:640px;margin-bottom:20px;background:rgba(33,150,243,0.08);border-left:3px solid #2196f3;">
            <mat-card-content style="display:flex;gap:10px;align-items:flex-start;padding:12px 16px;">
              <mat-icon style="color:#2196f3;flex-shrink:0;">info</mat-icon>
              <span style="font-size:0.9rem;line-height:1.4;">
                <strong>Note:</strong> if a player disconnects, they can reconnect at anytime using their same username and game code. The game cannot start with disconnected players!
              </span>
            </mat-card-content>
          </mat-card>
        }
        @if (gameState.isSpectator()) {
          <h2>Card Creation Phase</h2>
          <p style="opacity:0.6;">You are a spectator. Waiting for all players to complete their cards...</p>
          @if (gameState.isCreator() && allPlayersReady()) {
            <button mat-flat-button color="primary" (click)="onBeginGame()" [disabled]="isLoading()">
              Begin Game
            </button>
          }
        } @else if (isSubmitted()) {
          <h2>Cards Submitted!</h2>
          <p style="opacity:0.6;">Waiting for other players to complete their cards...</p>
          @if (gameState.isCreator() && allPlayersReady()) {
            <mat-card style="max-width:400px;margin-top:16px;">
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
          <p style="opacity:0.6;">Fill in 2 cards for each category, then click Submit.</p>

          <form [formGroup]="cardsForm" (ngSubmit)="onSubmitCards()">
            @for (group of cardGroups; track group.type) {
              <div style="margin-bottom:28px;">
                <h3 [style.color]="group.color" style="margin-bottom:4px;">
                  {{ group.label }} — {{ group.description }}
                </h3>
                <div style="display:flex;flex-direction:column;gap:12px;">
                  @for (i of [0,1]; track i) {
                    <mat-form-field appearance="outline" style="width:100%;max-width:600px;">
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
                <mat-spinner diameter="20" style="display:inline-block;vertical-align:middle;"></mat-spinner>
              } @else {
                Submit Cards
              }
            </button>
          </form>
        }
      </main>
    </div>
  `,
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
