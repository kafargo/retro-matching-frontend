import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
  GameStateUpdatedEvent,
  YourCardsUpdatedEvent,
  GameFinishedEvent,
  PlayerConnectionChangedEvent,
} from '../models/game.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  /**
   * Persistent subjects that survive socket reconnects.
   * Event handlers are re-attached every time connect() creates a new socket.
   */
  private readonly gameStateUpdated$ = new Subject<GameStateUpdatedEvent>();
  private readonly yourCardsUpdated$ = new Subject<YourCardsUpdatedEvent>();
  private readonly gameFinished$ = new Subject<GameFinishedEvent>();
  private readonly playerConnectionChanged$ = new Subject<PlayerConnectionChangedEvent>();

  /** Connect the socket and join the game room. */
  connect(gameCode: string, sessionToken: string): void {
    if (this.socket?.connected) {
      this.joinRoom(gameCode, sessionToken);
      return;
    }

    this.socket = io(environment.apiUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // Wire all events to the persistent subjects
    this.socket.on('game_state_updated', (data) => this.gameStateUpdated$.next(data));
    this.socket.on('your_cards_updated', (data) => this.yourCardsUpdated$.next(data));
    this.socket.on('game_finished', (data) => this.gameFinished$.next(data));
    this.socket.on('player_connection_changed', (data) => this.playerConnectionChanged$.next(data));

    this.socket.on('connect', () => {
      this.joinRoom(gameCode, sessionToken);
    });

    this.socket.on('connect_error', (err: Error) => {
      console.error('[Socket] connection error', err.message);
    });
  }

  /** Join (or re-join) the game room with the session token. */
  joinRoom(gameCode: string, sessionToken: string): void {
    this.socket?.emit('join_game_room', { game_code: gameCode, session_token: sessionToken });
  }

  /** Leave the game room and disconnect. */
  disconnect(gameCode: string, sessionToken: string): void {
    this.socket?.emit('leave_game_room', { game_code: gameCode, session_token: sessionToken });
    this.socket?.disconnect();
    this.socket = null;
  }

  onGameStateUpdated(): Observable<GameStateUpdatedEvent> {
    return this.gameStateUpdated$.asObservable();
  }

  onYourCardsUpdated(): Observable<YourCardsUpdatedEvent> {
    return this.yourCardsUpdated$.asObservable();
  }

  onGameFinished(): Observable<GameFinishedEvent> {
    return this.gameFinished$.asObservable();
  }

  onPlayerConnectionChanged(): Observable<PlayerConnectionChangedEvent> {
    return this.playerConnectionChanged$.asObservable();
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
    this.gameStateUpdated$.complete();
    this.yourCardsUpdated$.complete();
    this.gameFinished$.complete();
    this.playerConnectionChanged$.complete();
  }
}
