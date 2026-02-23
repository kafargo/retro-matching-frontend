export type CardType = 'start' | 'stop' | 'continue';
export type PlayerRole = 'player' | 'spectator';

export interface Card {
  id: number;
  card_type: CardType;
  text: string;
}
