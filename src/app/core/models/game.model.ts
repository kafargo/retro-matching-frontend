export type GamePhase = 'lobby' | 'card_creation' | 'playing' | 'final_round' | 'finished';
export type RoundPhase = 'submitting' | 'revealed' | 'complete';

export interface SubmissionStatus {
  player_id: number;
  display_name: string;
  has_submitted: boolean;
}

export interface RevealedSubmission {
  submission_id: number;
  card_id: number;
  card_type: string;
  card_text: string;
}

export interface CurrentRound {
  id: number;
  round_number: number;
  judge_id: number | null;
  adjective: string;
  phase: RoundPhase;
  is_final_round: boolean;
  submission_status: SubmissionStatus[];
  revealed_submissions: RevealedSubmission[] | null;
  winner_id: number | null;
  winning_card_id: number | null;
}

export interface PlayerSummary {
  id: number;
  display_name: string;
  role: 'player' | 'spectator';
  join_order: number;
  score: number;
  is_connected: boolean;
  is_ready: boolean;
  card_count: number;
}

export interface GameState {
  code: string;
  phase: GamePhase;
  creator_id: number;
  players: PlayerSummary[];
  current_round: CurrentRound | null;
}

export interface FinalScore {
  player_id: number;
  display_name: string;
  score: number;
}

// Payload shapes for HTTP responses

export interface CreateGameResponse {
  game_code: string;
  session_token: string;
  player_id: number;
  player: PlayerSummary;
}

export interface JoinGameResponse {
  session_token: string;
  player_id: number;
  player: PlayerSummary;
}

export interface GameStateResponse {
  type: string;
  game: GameState;
  my_cards: Card[];
}

// Socket event payloads

export interface GameStateUpdatedEvent {
  type: 'game_state_updated';
  game: GameState;
}

export interface YourCardsUpdatedEvent {
  type: 'your_cards_updated';
  cards: Card[];
}

export interface GameFinishedEvent {
  type: 'game_finished';
  final_scores: FinalScore[];
}

export interface PlayerConnectionChangedEvent {
  type: 'player_connection_changed';
  player_id: number;
  is_connected: boolean;
}

export type Card = import('./card.model').Card;
