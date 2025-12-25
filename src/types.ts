export type GemColor = 'red' | 'blue' | 'yellow' | 'purple' | 'orange' | 'green';

export interface TokenBank {
  red: number;
  blue: number;
  yellow: number;
  purple: number;
  orange: number;
  green: number;
  gray: number; // S.H.I.E.L.D. / Gold wild token
}

export type CardTier = 1 | 2 | 3;

export interface Cost {
  red?: number;
  blue?: number;
  yellow?: number;
  purple?: number;
  orange?: number;
}

export interface Card {
  id: string;
  tier: CardTier;
  points: number;
  bonus: GemColor; // The gem color this card provides as a discount
  cost: Cost;
  avengersTag?: boolean; // For the Avengers Assemble tile condition
  imageUrl?: string; // Placeholder for now, can be mapped to assets later
  name?: string;
}

export interface Noble {
  id: string;
  points: number;
  requirements: Cost; // Using Cost interface for gem requirements
  imageUrl?: string;
}

export interface Location {
  id: string;
  name: string;
  points: number;
  requirements: Cost;
  image: string; // Path to asset
}

export interface Player {
  id: string;
  uuid?: string; // Stable ID for reconnection
  name: string;
  tokens: TokenBank;
  hand: Card[]; // Reserved cards
  tableau: Card[]; // Recruited cards
  nobles: Noble[];
  locations: Location[];
  points: number;
  isHuman: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  tokens: TokenBank;
  decks: {
    1: Card[];
    2: Card[];
    3: Card[];
  };
  market: {
    1: Card[];
    2: Card[];
    3: Card[];
  };
  nobles: Noble[]; // Keeping for backward compatibility if needed, but Locations replace 'nobles' mechanic here
  locations: Location[];
  pendingLocationSelection?: Location[]; // If a player qualifies for multiple locations
  turn: number;
  winner: string | null;
  logs: string[];
  status: 'LOBBY' | 'PLAYING' | 'GAME_OVER' | 'ABORTED';
  finalRound?: boolean;
  turnDeadline?: number; // Unix timestamp for when the turn ends
  config: {
    turnLimitSeconds: number;
    // other config options can go here
  };
}
