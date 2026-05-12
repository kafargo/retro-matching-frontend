import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-rules-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Welcome to the Retrospective Matching Game!</h2>
    <mat-dialog-content>
      <p>
        The purpose of this game is to provide a fun and different way of generating insights
        from recent successes, challenges and opportunities. Here's how it works:
      </p>
      <ol class="rules-list">
        <li>
          Each player creates 6 cards: two things they want to start, two things they want to
          stop, and two things they want to continue.
        </li>
        <li>
          Once all players have created cards, they will be randomly shuffled and
          redistributed to all players.
        </li>
        <li>
          Each turn, players will see a random adjective for that round. They must pick a card
          in their hand that best matches the adjective they see.
        </li>
        <li>
          Once all cards are submitted, everyone votes on the best match. The host then takes
          a moment to pause for any discussion or capture insights.
        </li>
        <li>
          This continues for six rounds in total. The player who got the most winning cards at
          the end of 6 rounds wins!
        </li>
      </ol>
      <p class="rules-footer">
        The points really don't matter; the idea is to have a little bit of fun while you're
        generating insights about how to improve.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="dialogRef.close()">
        Let's create cards
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .rules-list {
      padding-left: 20px;
      margin: 12px 0;
    }
    .rules-list li {
      margin-bottom: 10px;
      line-height: 1.45;
    }
    .rules-footer {
      margin-top: 16px;
      font-style: italic;
      opacity: 0.75;
    }
  `],
})
export class RulesDialogComponent {
  readonly dialogRef = inject(MatDialogRef<RulesDialogComponent>);
}
