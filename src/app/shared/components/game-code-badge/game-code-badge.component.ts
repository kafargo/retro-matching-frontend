import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../core/services/game-state.service';

@Component({
  selector: 'app-game-code-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (gameState.gameCode()) {
      <div class="game-code-badge" title="Game code — share this to invite others">
        {{ gameState.gameCode() }}
      </div>
    }
  `,
})
export class GameCodeBadgeComponent {
  readonly gameState = inject(GameStateService);
}
