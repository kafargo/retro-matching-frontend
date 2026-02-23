import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateGameResponse,
  JoinGameResponse,
  GameStateResponse,
} from '../models/game.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Create a new game. */
  createGame(displayName: string, role: 'player' | 'spectator'): Observable<CreateGameResponse> {
    return this.http.post<CreateGameResponse>(`${this.base}/api/games`, {
      display_name: displayName,
      role,
    });
  }

  /** Join an existing game by code. */
  joinGame(code: string, displayName: string): Observable<JoinGameResponse> {
    return this.http.post<JoinGameResponse>(`${this.base}/api/games/${code}/join`, {
      display_name: displayName,
    });
  }

  /** Get current game state. */
  getGameState(code: string, token: string): Observable<GameStateResponse> {
    return this.http.get<GameStateResponse>(`${this.base}/api/games/${code}`, {
      headers: this._auth(token),
    });
  }

  /** Start game (lobby → card_creation). Creator only. */
  startGame(code: string, token: string): Observable<{ phase: string }> {
    return this.http.post<{ phase: string }>(`${this.base}/api/games/${code}/start`, {}, {
      headers: this._auth(token),
    });
  }

  /** Submit 6 cards. */
  submitCards(
    code: string,
    token: string,
    cards: { card_type: string; text: string }[]
  ): Observable<{ submitted: boolean }> {
    return this.http.post<{ submitted: boolean }>(`${this.base}/api/games/${code}/cards`, { cards }, {
      headers: this._auth(token),
    });
  }

  /** Mark self as ready. */
  markReady(code: string, token: string): Observable<{ ready: boolean }> {
    return this.http.post<{ ready: boolean }>(`${this.base}/api/games/${code}/ready`, {}, {
      headers: this._auth(token),
    });
  }

  /** Begin the game (card_creation → playing). Creator only. */
  beginGame(code: string, token: string): Observable<{ phase: string }> {
    return this.http.post<{ phase: string }>(`${this.base}/api/games/${code}/begin`, {}, {
      headers: this._auth(token),
    });
  }

  /** Submit a card for the current round. */
  submitCard(
    code: string,
    roundId: number,
    cardId: number,
    token: string
  ): Observable<{ submitted: boolean }> {
    return this.http.post<{ submitted: boolean }>(
      `${this.base}/api/games/${code}/rounds/${roundId}/submit`,
      { card_id: cardId },
      { headers: this._auth(token) }
    );
  }

  /** Judge picks who winning submission. */
  pickWinner(
    code: string,
    roundId: number,
    submissionId: number,
    token: string
  ): Observable<{ winner_player_id: number; final_round_triggered: boolean }> {
    return this.http.post<{ winner_player_id: number; final_round_triggered: boolean }>(
      `${this.base}/api/games/${code}/rounds/${roundId}/pick-winner`,
      { submission_id: submissionId },
      { headers: this._auth(token) }
    );
  }

  /** Vote in the final round. */
  vote(
    code: string,
    roundId: number,
    cardId: number,
    token: string
  ): Observable<{ voted: boolean; game_finished: boolean }> {
    return this.http.post<{ voted: boolean; game_finished: boolean }>(
      `${this.base}/api/games/${code}/rounds/${roundId}/vote`,
      { card_id: cardId },
      { headers: this._auth(token) }
    );
  }

  /** Delete game. Creator only. */
  finishGame(code: string, token: string): Observable<{ deleted: boolean }> {
    return this.http.post<{ deleted: boolean }>(`${this.base}/api/games/${code}/finish`, {}, {
      headers: this._auth(token),
    });
  }

  private _auth(token: string): HttpHeaders {
    return new HttpHeaders({ 'X-Session-Token': token });
  }
}
