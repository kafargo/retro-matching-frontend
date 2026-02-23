import { Injectable, OnDestroy } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
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
    return this._on<GameStateUpdatedEvent>('game_state_updated');
  }

  onYourCardsUpdated(): Observable<YourCardsUpdatedEvent> {
    return this._on<YourCardsUpdatedEvent>('your_cards_updated');
  }

  onGameFinished(): Observable<GameFinishedEvent> {
    return this._on<GameFinishedEvent>('game_finished');
  }

  onPlayerConnectionChanged(): Observable<PlayerConnectionChangedEvent> {
    return this._on<PlayerConnectionChangedEvent>('player_connection_changed');
  }

  private _on<T>(eventName: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => subscriber.next(data);
      this.socket?.on(eventName, handler);
      return () => this.socket?.off(eventName, handler);
    });
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
  }
}
