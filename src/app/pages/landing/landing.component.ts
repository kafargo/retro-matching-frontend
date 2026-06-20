import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="full-center landing-page">
      <header class="landing-header">
        <h1>Retro Match</h1>
        <p>Change up your retro with this apples-to-apples style retro game!</p>
      </header>

      @if (!activePanel()) {
        <div class="landing-actions">
          <mat-card class="choice-card" (click)="activePanel.set('create')">
            <mat-card-header><mat-card-title>Create Game</mat-card-title></mat-card-header>
            <mat-card-content>
              <p>Start a new session and invite your team.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-flat-button color="primary" (click)="$event.stopPropagation(); activePanel.set('create')">
                Create Game
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="choice-card" (click)="activePanel.set('join')">
            <mat-card-header><mat-card-title>Join Game</mat-card-title></mat-card-header>
            <mat-card-content>
              <p>Enter a game code to join your team.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-flat-button color="accent" (click)="$event.stopPropagation(); activePanel.set('join')">
                Join Game
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      }

      @if (activePanel() === 'create') {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>Create a Game</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="createForm" (ngSubmit)="onCreateGame()">
              <mat-form-field appearance="outline" class="form-field first-field">
                <mat-label>Display Name</mat-label>
                <input matInput formControlName="displayName" maxlength="50" autocomplete="off" />
                <mat-error>Name is required (max 50 chars)</mat-error>
              </mat-form-field>

              <div class="field-label">Join as:</div>
              <mat-radio-group formControlName="role" class="role-options">
                <mat-radio-button value="player">Player</mat-radio-button>
                <mat-radio-button value="spectator">Spectator</mat-radio-button>
              </mat-radio-group>

              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="activePanel.set(null)">Back</button>
                <button mat-flat-button color="primary" type="submit" [disabled]="isLoading()">
                  @if (isLoading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Create Game
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      @if (activePanel() === 'join') {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>Join a Game</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="joinForm" (ngSubmit)="onJoinGame()">
              <mat-form-field appearance="outline" class="form-field first-field">
                <mat-label>Game Code</mat-label>
                <input matInput formControlName="gameCode" maxlength="6" autocomplete="off"
                       class="game-code-input" />
                <mat-error>6-character code required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Display Name</mat-label>
                <input matInput formControlName="displayName" maxlength="50" autocomplete="off" />
                <mat-error>Name is required (max 50 chars)</mat-error>
              </mat-form-field>

              <div class="form-actions compact">
                <button mat-stroked-button type="button" (click)="activePanel.set(null)">Back</button>
                <button mat-flat-button color="accent" type="submit" [disabled]="isLoading()">
                  @if (isLoading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Join Game
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }
    </div>

    <div class="help-link">
      New to the game? <a href="https://www.youtube.com/watch?v=-k1uaXFupHI" target="_blank" rel="noopener noreferrer">Watch how to play</a>
    </div>
  `,
  styles: [`
    .landing-page {
      justify-content: center;
      padding: clamp(44px, 9dvh, 76px) clamp(24px, 6vw, 48px) 96px;
      text-align: center;
    }

    .landing-header {
      width: min(100%, 640px);
      margin-bottom: 44px;
    }

    .landing-header h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 8vw, 2.5rem);
      font-weight: 900;
      line-height: 1.05;
    }

    .landing-header p,
    .choice-card p {
      margin: 0;
      color: var(--muted-text);
      line-height: 1.62;
    }

    .landing-header p {
      max-width: 520px;
      margin: 0 auto;
    }

    .landing-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 280px));
      gap: 28px;
      justify-content: center;
      width: min(100%, 640px);
    }

    .choice-card {
      cursor: pointer;
      text-align: left;
    }

    .choice-card mat-card-header {
      padding: 20px 20px 8px;
    }

    .choice-card mat-card-title {
      line-height: 1.25;
    }

    .choice-card mat-card-content {
      padding: 0 20px 18px;
    }

    .choice-card mat-card-actions {
      gap: 12px;
      padding: 0 20px 20px;
    }

    .choice-card button,
    .form-actions button {
      padding-inline: 18px;
    }

    .form-card {
      width: min(100%, 380px);
      text-align: left;
    }

    .form-field {
      width: 100%;
    }

    .first-field {
      margin-top: 16px;
    }

    .field-label {
      margin: 12px 0 8px;
      color: var(--muted-text);
    }

    .role-options,
    .form-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .form-actions {
      margin-top: 20px;
    }

    .form-actions.compact {
      margin-top: 8px;
    }

    .game-code-input {
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    .help-link {
      position: fixed;
      right: 16px;
      bottom: max(16px, env(safe-area-inset-bottom));
      left: 16px;
      text-align: center;
      color: rgba(224, 224, 224, 0.56);
      font-size: 0.85rem;
      pointer-events: none;
    }

    .help-link a {
      color: inherit;
      pointer-events: auto;
    }

    @media (max-width: 640px) {
      .landing-page {
        justify-content: flex-start;
        padding: max(40px, env(safe-area-inset-top)) 24px 84px;
      }

      .landing-header {
        margin-bottom: 28px;
      }

      .landing-actions {
        grid-template-columns: 1fr;
        gap: 18px;
      }

      .choice-card,
      .form-card {
        width: 100%;
      }

      .role-options {
        flex-direction: column;
        gap: 8px;
      }

      .form-actions {
        gap: 10px;
      }

      .form-actions button {
        flex: 1 1 130px;
      }

      .choice-card mat-card-header {
        padding: 18px 18px 8px;
      }

      .choice-card mat-card-content {
        padding: 0 18px 18px;
      }

      .choice-card mat-card-actions {
        padding: 0 18px 18px;
      }

      .choice-card button {
        width: 100%;
      }
    }
  `],
})
export class LandingComponent {
  private readonly api = inject(ApiService);
  private readonly gameStateSvc = inject(GameStateService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly activePanel = signal<null | 'create' | 'join'>(null);
  readonly isLoading = signal(false);

  constructor() {
    try {
      if (sessionStorage.getItem('kicked_from_game') === '1') {
        sessionStorage.removeItem('kicked_from_game');
        this.snack.open('The host removed you from the game.', 'Dismiss', { duration: 5000 });
      }
    } catch {}
  }

  readonly createForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(50)]],
    role: ['player'],
  });

  readonly joinForm = this.fb.group({
    gameCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    displayName: ['', [Validators.required, Validators.maxLength(50)]],
  });

  async onCreateGame(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    try {
      const { displayName, role } = this.createForm.value;
      const response = await firstValueFrom(
        this.api.createGame(displayName!, (role as 'player' | 'spectator') ?? 'player')
      );

      // Fetch initial game state
      const stateResp = await firstValueFrom(
        this.api.getGameState(response.game_code, response.session_token)
      );

      this.gameStateSvc.seedFromResponse(
        response.game_code,
        response.session_token,
        response.player_id,
        stateResp.game,
        stateResp.my_cards ?? []
      );

      this.router.navigate(['/game', response.game_code, 'card-creation']);
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Failed to create game.';
      this.snack.open(msg, 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onJoinGame(): Promise<void> {
    if (this.joinForm.invalid) {
      this.joinForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    try {
      const { gameCode, displayName } = this.joinForm.value;
      const response = await firstValueFrom(
        this.api.joinGame(gameCode!.toUpperCase(), displayName!)
      );

      // Fetch initial game state
      const stateResp = await firstValueFrom(
        this.api.getGameState(gameCode!.toUpperCase(), response.session_token)
      );

      this.gameStateSvc.seedFromResponse(
        gameCode!.toUpperCase(),
        response.session_token,
        response.player_id,
        stateResp.game,
        stateResp.my_cards ?? []
      );

      // Navigate to the correct phase. New games and rejoins during card_creation
      // both land on the card-creation screen; lobby is folded into card-creation.
      const phase = stateResp.game.phase;
      const phaseRoutes: Record<string, string> = {
        lobby: 'card-creation',
        card_creation: 'card-creation',
        playing: 'playing',
        finished: 'finished',
      };
      const route = phaseRoutes[phase] ?? 'card-creation';
      this.router.navigate(['/game', gameCode!.toUpperCase(), route]);
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Failed to join game.';
      this.snack.open(msg, 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }
}
