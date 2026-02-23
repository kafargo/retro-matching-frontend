import { Injectable, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  GameState,
  GamePhase,
  PlayerSummary,
  GameStateResponse,
} from '../models/game.model';
import { Card } from '../models/card.model';
import { SessionService } from './session.service';
import { SocketService } from './socket.service';
import { environment } from '../../../environments/environment';

const PHASE_TO_ROUTE: Record<GamePhase, string> = {
  lobby: 'lobby',
  card_creation: 'card-creation',
  playing: 'playing',
  final_round: 'final-round',
  finished: 'finished',
};

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly socketSvc = inject(SocketService);
  private readonly destroyRef = inject(DestroyRef);

  // --- Writable signals ---
  private readonly _gameState = signal<GameState | null>(null);
  private readonly _myCards = signal<Card[]>([]);
  private readonly _myPlayer = signal<PlayerSummary | null>(null);
  private readonly _isInitialised = signal(false);

  // --- Public read-only signals ---
  readonly gameState = this._gameState.asReadonly();
  readonly myCards = this._myCards.asReadonly();
  readonly myPlayer = this._myPlayer.asReadonly();
  readonly isInitialised = this._isInitialised.asReadonly();

  // --- Computed signals ---
  readonly currentPhase = computed(() => this._gameState()?.phase ?? null);
  readonly isJudge = computed(
    () =>
      this._gameState()?.current_round?.judge_id != null &&
      this._gameState()?.current_round?.judge_id === this._myPlayer()?.id
  );
  readonly isCreator = computed(
    () =>
      this._myPlayer()?.id != null &&
      this._myPlayer()?.id === this._gameState()?.creator_id
  );
  readonly isSpectator = computed(() => this._myPlayer()?.role === 'spectator');
  readonly gameCode = computed(() => this._gameState()?.code ?? null);

  constructor() {
    // Socket subscriptions — keep receiving updates for the entire service lifetime
    this.socketSvc
      .onGameStateUpdated()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        this._gameState.set(event.game);
        this._syncMyPlayer(event.game);
      });

    this.socketSvc
      .onYourCardsUpdated()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        this._myCards.set(event.cards);
      });

    this.socketSvc
      .onPlayerConnectionChanged()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const state = this._gameState();
        if (!state) return;
        const updated: GameState = {
          ...state,
          players: state.players.map((p) =>
            p.id === event.player_id ? { ...p, is_connected: event.is_connected } : p
          ),
        };
        this._gameState.set(updated);
        this._syncMyPlayer(updated);
      });

    // Auto-navigate when phase changes
    effect(() => {
      const phase = this.currentPhase();
      const code = this._gameState()?.code;
      if (phase && code) {
        const targetRoute = PHASE_TO_ROUTE[phase];
        const currentUrl = this.router.url;
        const expectedUrl = `/game/${code}/${targetRoute}`;
        // Only navigate if not already on the correct route to avoid loops
        if (!currentUrl.endsWith(targetRoute)) {
          this.router.navigate([expectedUrl]);
        }
      }
    });
  }

  /** Initialise game state from sessionStorage. Called after login or on app bootstrap. */
  async initFromSession(): Promise<boolean> {
    const sess = this.session.get();
    if (!sess) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<GameStateResponse>(
          `${environment.apiUrl}/api/games/${sess.gameCode}/reconnect`,
          {},
          { headers: this._authHeaders() }
        )
      );

      this._gameState.set(response.game);
      this._myCards.set(response.my_cards ?? []);
      this._syncMyPlayer(response.game);
      this._isInitialised.set(true);

      // Connect socket and join room
      this.socketSvc.connect(sess.gameCode, sess.sessionToken);

      return true;
    } catch {
      // Session invalid or game no longer exists
      this.session.clear();
      return false;
    }
  }

  /** Called immediately after create/join API response to seed state. */
  seedFromResponse(
    gameCode: string,
    sessionToken: string,
    playerId: number,
    gameState: GameState,
    cards: Card[] = []
  ): void {
    this.session.save({ gameCode, sessionToken, playerId });
    this._gameState.set(gameState);
    this._myCards.set(cards);
    this._syncMyPlayer(gameState, playerId);
    this._isInitialised.set(true);
    this.socketSvc.connect(gameCode, sessionToken);
  }

  /** Fetch fresh game state from server and update signals. */
  async refreshState(): Promise<void> {
    const sess = this.session.get();
    if (!sess) return;
    try {
      const response = await firstValueFrom(
        this.http.get<GameStateResponse>(
          `${environment.apiUrl}/api/games/${sess.gameCode}`,
          { headers: this._authHeaders() }
        )
      );
      this._gameState.set(response.game);
      this._myCards.set(response.my_cards ?? []);
      this._syncMyPlayer(response.game);
    } catch {
      // Silently ignore; socket will push updates
    }
  }

  /** Clear all state and disconnect socket (on game finish). */
  reset(): void {
    const sess = this.session.get();
    const code = this._gameState()?.code;
    if (sess && code) {
      this.socketSvc.disconnect(code, sess.sessionToken);
    }
    this.session.clear();
    this._gameState.set(null);
    this._myCards.set([]);
    this._myPlayer.set(null);
    this._isInitialised.set(false);
  }

  /** Return HTTP headers with X-Session-Token. */
  authHeaders(): HttpHeaders {
    return this._authHeaders();
  }

  private _authHeaders(): HttpHeaders {
    const sess = this.session.get();
    return new HttpHeaders(sess ? { 'X-Session-Token': sess.sessionToken } : {});
  }

  private _syncMyPlayer(state: GameState, fallbackId?: number): void {
    const sess = this.session.get();
    const id = fallbackId ?? sess?.playerId;
    if (id == null) return;
    const player = state.players.find((p) => p.id === id) ?? null;
    this._myPlayer.set(player);
  }
}
