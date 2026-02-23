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
    <div class="full-center">
      <h1 style="font-size:2.5rem;font-weight:900;letter-spacing:-1px;margin-bottom:8px;">
        Retro Match
      </h1>
      <p style="opacity:0.5;margin-bottom:40px;">Change up your retro with this apples-to-apples style retro game!</p>

      @if (!activePanel()) {
        <div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:center;">
          <mat-card style="width:280px;cursor:pointer;" (click)="activePanel.set('create')">
            <mat-card-header><mat-card-title>Create Game</mat-card-title></mat-card-header>
            <mat-card-content>
              <p style="opacity:0.7;">Start a new session and invite your team.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-flat-button color="primary" (click)="$event.stopPropagation(); activePanel.set('create')">
                Create Game
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card style="width:280px;cursor:pointer;" (click)="activePanel.set('join')">
            <mat-card-header><mat-card-title>Join Game</mat-card-title></mat-card-header>
            <mat-card-content>
              <p style="opacity:0.7;">Enter a game code to join your team.</p>
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
        <mat-card style="width:360px;">
          <mat-card-header>
            <mat-card-title>Create a Game</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="createForm" (ngSubmit)="onCreateGame()">
              <mat-form-field appearance="outline" style="width:100%;margin-top:16px;">
                <mat-label>Display Name</mat-label>
                <input matInput formControlName="displayName" maxlength="50" autocomplete="off" />
                <mat-error>Name is required (max 50 chars)</mat-error>
              </mat-form-field>

              <div style="margin:12px 0 8px;">Join as:</div>
              <mat-radio-group formControlName="role" style="display:flex;gap:24px;">
                <mat-radio-button value="player">Player</mat-radio-button>
                <mat-radio-button value="spectator">Spectator</mat-radio-button>
              </mat-radio-group>

              <div style="display:flex;gap:12px;margin-top:20px;">
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
        <mat-card style="width:360px;">
          <mat-card-header>
            <mat-card-title>Join a Game</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="joinForm" (ngSubmit)="onJoinGame()">
              <mat-form-field appearance="outline" style="width:100%;margin-top:16px;">
                <mat-label>Game Code</mat-label>
                <input matInput formControlName="gameCode" maxlength="6" autocomplete="off"
                       style="text-transform:uppercase;letter-spacing:0.15em;" />
                <mat-error>6-character code required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%;">
                <mat-label>Display Name</mat-label>
                <input matInput formControlName="displayName" maxlength="50" autocomplete="off" />
                <mat-error>Name is required (max 50 chars)</mat-error>
              </mat-form-field>

              <div style="display:flex;gap:12px;margin-top:8px;">
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
  `,
})
export class LandingComponent {
  private readonly api = inject(ApiService);
  private readonly gameStateSvc = inject(GameStateService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly activePanel = signal<null | 'create' | 'join'>(null);
  readonly isLoading = signal(false);

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

      this.router.navigate(['/game', response.game_code, 'lobby']);
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

      this.router.navigate(['/game', gameCode!.toUpperCase(), 'lobby']);
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Failed to join game.';
      this.snack.open(msg, 'Dismiss', { duration: 4000 });
    } finally {
      this.isLoading.set(false);
    }
  }
}
