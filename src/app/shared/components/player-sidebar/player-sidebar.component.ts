import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlayerSummary, SubmissionStatus, GamePhase } from '../../../core/models/game.model';
import { GameStateService } from '../../../core/services/game-state.service';

@Component({
  selector: 'app-player-sidebar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="sidebar-header">Players</div>
    @for (player of players(); track player.id) {
      <div class="player-item">
        <div class="connected-dot" [class.disconnected]="!player.is_connected"></div>
        <span class="player-name">{{ player.display_name }}</span>
        @if (player.role === 'spectator') {
          <mat-icon class="status-icon" matTooltip="Spectator" style="font-size:16px;opacity:0.5;">visibility</mat-icon>
        }
        @if (phase() === 'card_creation' && player.role === 'player') {
          @if (player.is_ready) {
            <mat-icon class="status-icon" style="color:#4caf50;" matTooltip="Ready">check_circle</mat-icon>
          } @else {
            <mat-icon class="status-icon" style="color:#757575;" matTooltip="Not ready">radio_button_unchecked</mat-icon>
          }
        }
        @if (phase() === 'playing' || phase() === 'final_round') {
          @if (isJudge(player.id)) {
            <mat-icon class="status-icon" style="color:#ffd700;" matTooltip="Judge">star</mat-icon>
          } @else if (player.role !== 'spectator') {
            @if (hasSubmitted(player.id)) {
              <mat-icon class="status-icon" style="color:#4caf50;" matTooltip="Submitted">check_circle</mat-icon>
            } @else {
              <mat-icon class="status-icon" style="color:#ff9800;" matTooltip="Pending">hourglass_empty</mat-icon>
            }
          }
        }
        @if (phase() === 'finished') {
          <span style="font-weight:700;color:#ffd700;">{{ player.score }}</span>
        }
      </div>
    }
  `,
  styles: [`
    .sidebar-header {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.5;
      margin-bottom: 8px;
    }
  `],
})
export class PlayerSidebarComponent {
  readonly players = input.required<PlayerSummary[]>();
  readonly phase = input.required<GamePhase>();
  readonly submissionStatus = input<SubmissionStatus[]>([]);
  readonly judgeId = input<number | null>(null);

  isJudge(playerId: number): boolean {
    return this.judgeId() === playerId;
  }

  hasSubmitted(playerId: number): boolean {
    return this.submissionStatus().some((s) => s.player_id === playerId && s.has_submitted);
  }
}
