import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlayerSummary, SubmissionStatus, VoteStatus, GamePhase, RoundPhase } from '../../../core/models/game.model';

@Component({
  selector: 'app-player-sidebar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="sidebar-header">Players</div>
    @for (player of players(); track player.id) {
      <div class="player-item" [class.disconnected-player]="!player.is_connected">
        <div class="connected-dot"
             [class.disconnected]="!player.is_connected"
             [matTooltip]="player.is_connected ? 'Connected' : 'Disconnected'"></div>
        <span class="player-name">{{ player.display_name }}</span>
        @if (player.role !== 'spectator' && (phase() === 'playing' || phase() === 'finished')) {
          <span class="score-badge" matTooltip="Score">{{ player.score }}</span>
        }
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
        @if (phase() === 'playing' && player.role !== 'spectator') {
          @if (roundPhase() === 'submitting') {
            @if (hasSubmitted(player.id)) {
              <mat-icon class="status-icon" style="color:#4caf50;" matTooltip="Submitted">check_circle</mat-icon>
            } @else {
              <mat-icon class="status-icon" style="color:#ff9800;" matTooltip="Pending">hourglass_empty</mat-icon>
            }
          } @else if (roundPhase() === 'voting') {
            @if (hasVoted(player.id)) {
              <mat-icon class="status-icon" style="color:#4caf50;" matTooltip="Voted">how_to_vote</mat-icon>
            } @else {
              <mat-icon class="status-icon" style="color:#ff9800;" matTooltip="Voting...">hourglass_empty</mat-icon>
            }
          } @else {
            <mat-icon class="status-icon" style="color:#4caf50;" matTooltip="Round complete">check_circle</mat-icon>
          }
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
    .score-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffd700;
      background: rgba(255, 215, 0, 0.12);
      border-radius: 8px;
      padding: 1px 7px;
      margin-left: auto;
      min-width: 18px;
      text-align: center;
    }
    .disconnected-player {
      opacity: 0.45;
    }
    .connected-dot.disconnected {
      background-color: #f44336;
      animation: pulse-disconnect 1.5s ease-in-out infinite;
    }
    @keyframes pulse-disconnect {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
  `],
})
export class PlayerSidebarComponent {
  readonly players = input.required<PlayerSummary[]>();
  readonly phase = input.required<GamePhase>();
  readonly submissionStatus = input<SubmissionStatus[]>([]);
  readonly voteStatus = input<VoteStatus[]>([]);
  readonly roundPhase = input<RoundPhase>('submitting');

  hasSubmitted(playerId: number): boolean {
    return this.submissionStatus().some((s) => s.player_id === playerId && s.has_submitted);
  }

  hasVoted(playerId: number): boolean {
    return this.voteStatus().some((s) => s.player_id === playerId && s.has_voted);
  }
}
