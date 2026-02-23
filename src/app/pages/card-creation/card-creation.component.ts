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
import { firstValueFrom } from 'rxjs';
import { GameStateService } from '../../core/services/game-state.service';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { PlayerSidebarComponent } from '../../shared/components/player-sidebar/player-sidebar.component';
import { GameCodeBadgeComponent } from '../../shared/components/game-code-badge/game-code-badge.component';

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
        />
      </nav>

      <main class="main-content">
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

  readonly cardGroups = CARD_GROUPS;
  readonly isLoading = signal(false);
  readonly isSubmitted = signal(false);

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
    return players
      .filter((p) => p.role === 'player')
      .every((p) => p.is_ready);
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
}
