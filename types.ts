export interface Player {
  uid: string;
  name: string;
  hand: number[];
  isHost: boolean;
  ready: boolean;
}

export type GameStatus = 'lobby' | 'playing' | 'level_complete' | 'game_over' | 'victory';

export type GameEventType = 'play' | 'mistake' | 'level_complete' | 'game_over' | 'victory' | 'star_used';

export interface GameEvent {
  type: GameEventType;
  message: string;
  timestamp: number;
  data?: any; // For flexible payload (e.g. lost cards)
}

export interface StarVote {
  requesterUid: string;
  requesterName: string;
  approvedBy: string[]; // List of UIDs who voted YES
  createdAt: number;
}

export interface GameState {
  id: string;
  status: GameStatus;
  level: number;
  lives: number;
  stars: number; // Ninja Stars count
  starVote?: StarVote | null; // Active voting session
  starBlocked?: boolean; // Cooldown flag after rejected vote
  lastPlayedCard: number;
  playedCardsHistory: number[];
  players: Player[];
  createdAt: number;
  lastEvent?: GameEvent;

  // Tracking Stats
  startTime: number;
  errorsMade: number;
  starsUsed: number;
  starsEfficiency: number;  // Total Cards removed by Stars 
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  isAnonymous: boolean;

  // Stats
  totalGamesPlayed?: number;
  highestLevelReached?: number;
}

export interface MatchData {
  matchId: string;
  playerIds: string[];
  playerNames: string[];
  result: 'victory' | 'game_over';
  levelReached: number;
  livesLeft: number;
  starsUsed: number;
  starsEfficiency: number;
  errorsMade: number;
  startTime: number;
  endTime: number;
  durationSeconds: number;
}


export interface Reaction {
  id: string;
  emoji: string;
  senderId: string;
  senderName: string; // Helpful for display context
  timestamp: number;
}