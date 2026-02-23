import { Injectable } from '@angular/core';
import { SessionData } from '../models/session.model';

const SESSION_KEY = 'retro_game_session';

@Injectable({ providedIn: 'root' })
export class SessionService {
  /** Save session data to sessionStorage. */
  save(data: SessionData): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  /** Retrieve session data or null if not present. */
  get(): SessionData | null {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionData;
    } catch {
      return null;
    }
  }

  /** Remove session data (on game finish or leave). */
  clear(): void {
    sessionStorage.removeItem(SESSION_KEY);
  }

  /** Return true if there is an active session. */
  hasSession(): boolean {
    return this.get() !== null;
  }
}
