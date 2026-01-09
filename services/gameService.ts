import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  arrayUnion, 
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { GameState, Player, GameEvent, GameStatus, StarVote } from '../types';
import { INITIAL_LIVES, MAX_LEVEL, MAX_PLAYERS, MAX_LIVES } from '../constants';

// --- Utility: Deck Generation ---
const generateDeck = () => Array.from({ length: 100 }, (_, i) => i + 1);

const calculateInitialLives = (playerCount: number): number => {
  return Math.min(playerCount + 1, MAX_LIVES); 
};

const calculateInitialStars = (playerCount: number): number => {
  // Rule: 1 Star for 2 players, 2 for 3, etc. (n-1)
  // Ensure at least 1 star if playing with 2+ players for fun, but 0 if solo (dev mode)
  return Math.max(0, playerCount - 1);
};

const shuffle = (array: number[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

// --- Firestore Logic ---

export const createRoom = async (user: any): Promise<string> => {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const roomRef = doc(db, 'rooms', roomId);

  const initialPlayer: Player = {
    uid: user.uid,
    name: user.displayName || `Guest ${user.uid.slice(0, 4)}`,
    hand: [],
    isHost: true,
    ready: false,
  };

  const initialState: GameState = {
    id: roomId,
    status: 'lobby',
    level: 1,
    lives: INITIAL_LIVES,
    stars: 0,
    starBlocked: false,
    lastPlayedCard: 0,
    playedCardsHistory: [],
    players: [initialPlayer],
    createdAt: Date.now(),
  };

  await setDoc(roomRef, initialState);
  return roomId;
};

export const joinRoom = async (roomId: string, user: any) => {
  const roomRef = doc(db, 'rooms', roomId);
  
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists()) throw new Error('Room not found');

    const data = snapshot.data() as GameState;
    if (data.status !== 'lobby') throw new Error('Game already in progress');
    if (data.players.length >= MAX_PLAYERS) throw new Error('Room is full (Max 6)');
    
    // Check if already joined
    if (data.players.find(p => p.uid === user.uid)) return;

    const newPlayer: Player = {
      uid: user.uid,
      name: user.displayName || `Guest ${user.uid.slice(0, 4)}`,
      hand: [],
      isHost: false,
      ready: false,
    };

    transaction.update(roomRef, {
      players: arrayUnion(newPlayer)
    });
  });
};

export const leaveRoom = async (roomId: string, userUid: string) => {
  const roomRef = doc(db, 'rooms', roomId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists()) return; // Room already gone

    const data = snapshot.data() as GameState;
    const playerToRemove = data.players.find(p => p.uid === userUid);
    
    if (!playerToRemove) return;

    const updatedPlayers = data.players.filter(p => p.uid !== userUid);

    // If no players left, delete room
    if (updatedPlayers.length === 0) {
      transaction.delete(roomRef);
      return;
    }

    // If host left, assign new host to the first remaining player
    if (playerToRemove.isHost) {
      updatedPlayers[0].isHost = true;
    }

    transaction.update(roomRef, {
      players: updatedPlayers
    });
  });
};

export const toggleReady = async (roomId: string, uid: string, currentPlayers: Player[]) => {
  const updatedPlayers = currentPlayers.map(p => 
    p.uid === uid ? { ...p, ready: !p.ready } : p
  );
  await updateDoc(doc(db, 'rooms', roomId), { players: updatedPlayers });
};

/**
 * Starts the game.
 * Calculates lives and stars based on player count.
 */
export const startGame = async (roomId: string, currentPlayers: Player[]) => {
  if (currentPlayers.length < 2) {
    throw new Error("Minimum 2 players required to start.");
  }
  
  const startLives = calculateInitialLives(currentPlayers.length);
  const startStars = calculateInitialStars(currentPlayers.length);

  await updateDoc(doc(db, 'rooms', roomId), {
    lives: startLives,
    stars: startStars,
    starBlocked: false,
    playedCardsHistory: [], 
    lastPlayedCard: 0,
    lastEvent: {
      type: 'play',
      message: 'Game Started',
      timestamp: Date.now()
    } as GameEvent
  });
  await startLevel(roomId, 1, currentPlayers);
};

export const startLevel = async (roomId: string, level: number, currentPlayers: Player[]) => {
  const deck = shuffle(generateDeck());
  const updatedPlayers = currentPlayers.map(p => {
    const hand = deck.splice(0, level).sort((a, b) => a - b);
    return { ...p, hand };
  });

  await updateDoc(doc(db, 'rooms', roomId), {
    status: 'playing',
    level,
    players: updatedPlayers,
    lastPlayedCard: 0,
    playedCardsHistory: [],
    // Clear any stuck votes or blocks
    starVote: null, 
    starBlocked: false,
    lastEvent: {
      type: 'play',
      message: `Level ${level} Started`,
      timestamp: Date.now()
    } as GameEvent
  });
};

export const playCard = async (roomId: string, playerUid: string, card: number) => {
  const roomRef = doc(db, 'rooms', roomId);

  try {
    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(roomRef);
      if (!sfDoc.exists()) throw "Room does not exist!";
      
      const gameState = sfDoc.data() as GameState;

      if (gameState.status !== 'playing') throw "Game not active";

      // 1. Identify Mistake
      const others = gameState.players.filter(p => p.uid !== playerUid);
      const lowerCardsFound = others.flatMap(p => p.hand.filter(c => c < card));
      const isMistake = lowerCardsFound.length > 0;

      // 2. Update Hands
      const updatedPlayers = gameState.players.map(p => {
        if (p.uid === playerUid) {
             return { ...p, hand: p.hand.filter(c => c !== card) };
        }
        if (isMistake) {
             return { ...p, hand: p.hand.filter(c => c >= card) };
        }
        return p;
      });

      // 3. Update Lives & Status
      let newLives = gameState.lives;
      let newStatus: GameStatus = gameState.status;
      let newLastEvent: GameEvent;
      const timestamp = Date.now();

      if (isMistake) {
        newLives = gameState.lives - 1;
        if (newLives <= 0) {
          newStatus = 'game_over';
        }
      }

      // 4. Global Level Completion Check
      const allHandsEmpty = updatedPlayers.every(p => p.hand.length === 0);

      if (newStatus !== 'game_over' && allHandsEmpty) {
          if (gameState.level >= MAX_LEVEL) {
             newStatus = 'victory';
          } else {
             newStatus = 'level_complete';
          }
      }

      // 5. Construct Event
      if (newStatus === 'game_over') {
         newLastEvent = {
            type: 'game_over',
            message: 'Game Over!',
            timestamp,
            data: { played: card, dropped: lowerCardsFound }
         };
      } else if (isMistake) {
         newLastEvent = {
            type: 'mistake',
            message: `Mistake! Lower cards dropped: ${lowerCardsFound.join(', ')}`,
            timestamp,
            data: { played: card, dropped: lowerCardsFound }
         };
      } else if (newStatus === 'victory') {
         newLastEvent = { type: 'victory', message: 'Mission Accomplished!', timestamp };
      } else if (newStatus === 'level_complete') {
         newLastEvent = { type: 'level_complete', message: 'Level Complete!', timestamp };
      } else {
         newLastEvent = { type: 'play', message: `Played ${card}`, timestamp };
      }

      // Add dropped cards to history so they are "played" before the high card
      const sortedDropped = [...lowerCardsFound].sort((a, b) => a - b);
      const newPlayedCardsHistory = [...gameState.playedCardsHistory, ...sortedDropped, card];

      transaction.update(roomRef, {
        lives: newLives,
        status: newStatus,
        lastPlayedCard: card,
        playedCardsHistory: newPlayedCardsHistory,
        players: updatedPlayers,
        lastEvent: newLastEvent,
        starBlocked: false // UNBLOCK star when a card is played
      });
    });
  } catch (e) {
    console.log("Transaction failed: ", e);
  }
};

/**
 * Ninja Star Logic
 */

// 1. Propose a star
export const proposeStar = async (roomId: string, requester: Player) => {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    starVote: {
      requesterUid: requester.uid,
      requesterName: requester.name,
      approvedBy: [],
      createdAt: Date.now()
    } as StarVote
  });
};

// 2. Vote on a star proposal
export const submitStarVote = async (roomId: string, voterUid: string, approved: boolean) => {
  const roomRef = doc(db, 'rooms', roomId);
  
  await runTransaction(db, async (transaction) => {
    const sfDoc = await transaction.get(roomRef);
    if (!sfDoc.exists()) throw "Room error";
    const gameState = sfDoc.data() as GameState;

    if (!gameState.starVote) return; // Vote already closed

    if (!approved) {
      // If ANYONE votes NO, cancel immediately AND BLOCK star usage
      transaction.update(roomRef, { 
        starVote: null,
        starBlocked: true 
      });
      return;
    }

    // Vote YES
    const currentApprovals = gameState.starVote.approvedBy || [];
    if (!currentApprovals.includes(voterUid)) {
       const newApprovals = [...currentApprovals, voterUid];
       
       // Check for consensus
       // We need (Total Players - 1) approvals, because requester is implied YES
       // The requester cannot vote in the UI, so we just check others.
       const requiredVotes = gameState.players.length - 1;

       if (newApprovals.length >= requiredVotes) {
          // UNANIMOUS! Execute Star Effect
          await executeStarEffect(transaction, roomRef, gameState);
       } else {
          // Just update vote count
          transaction.update(roomRef, { 
            "starVote.approvedBy": newApprovals 
          });
       }
    }
  });
};

// 3. Execute Star Effect (Internal)
const executeStarEffect = async (transaction: any, roomRef: any, gameState: GameState) => {
  // Logic Update:
  // 1. Every player reveals their lowest card.
  // 2. Determine the MAXIMUM of these revealed cards (Threshold).
  // 3. Remove ALL cards from ALL players that are smaller OR EQUAL to the Threshold.

  // A. Get lowest card from each player
  const lowestCardsPerPlayer: number[] = [];
  gameState.players.forEach(p => {
    if (p.hand.length > 0) {
      lowestCardsPerPlayer.push(Math.min(...p.hand));
    }
  });

  if (lowestCardsPerPlayer.length === 0) {
    // Should not happen if game is playing
    transaction.update(roomRef, { starVote: null });
    return;
  }

  // B. Determine Threshold (Highest of the lowest cards)
  const threshold = Math.max(...lowestCardsPerPlayer);

  // C. Remove cards <= Threshold from ALL hands
  const cardsRemoved: number[] = [];
  const updatedPlayers = gameState.players.map(p => {
    const kept = [];
    const removed = [];
    for (const c of p.hand) {
      // CHANGED: Now inclusive (<=)
      if (c <= threshold) {
        removed.push(c);
        cardsRemoved.push(c);
      } else {
        kept.push(c);
      }
    }
    return { ...p, hand: kept };
  });

  // D. Level Completion Check
  const allHandsEmpty = updatedPlayers.every(p => p.hand.length === 0);
  let newStatus: GameStatus = gameState.status;
  let newLastEvent: GameEvent;

  if (allHandsEmpty) {
    if (gameState.level >= MAX_LEVEL) {
      newStatus = 'victory';
      newLastEvent = { type: 'victory', message: 'Mission Accomplished!', timestamp: Date.now() };
    } else {
      newStatus = 'level_complete';
      newLastEvent = { type: 'level_complete', message: 'Level Complete!', timestamp: Date.now() };
    }
  } else {
    // Normal star event
    newLastEvent = {
      type: 'star_used',
      message: `Ninja Star! Dropped cards <= ${threshold}.`,
      timestamp: Date.now(),
      data: { removedCards: cardsRemoved, threshold }
    };
  }

  // E. Commit
  const sortedRemoved = cardsRemoved.sort((a, b) => a - b);
  const newPlayedCardsHistory = [...(gameState.playedCardsHistory || []), ...sortedRemoved];
  
  transaction.update(roomRef, {
    stars: Math.max(0, gameState.stars - 1),
    starVote: null, // Clear vote
    players: updatedPlayers,
    status: newStatus,
    lastEvent: newLastEvent,
    lastPlayedCard: threshold,
    playedCardsHistory: newPlayedCardsHistory
  });
};


export const nextLevel = async (gameState: GameState) => {
  const allHandsEmpty = gameState.players.every(p => p.hand.length === 0);
  if (!allHandsEmpty && gameState.status !== 'level_complete') return;

  const currentLevel = gameState.level;
  const nextLvl = currentLevel + 1;
  let newLives = gameState.lives;
  let newStars = gameState.stars;

  // Level Up Rewards
  // Lives: After Level 3, 6, 9
  if (currentLevel === 3 || currentLevel === 6 || currentLevel === 9) {
    newLives = Math.min(newLives + 1, MAX_LIVES);
  }

  // Stars: After Level 2, 5, 8
  if (currentLevel === 2 || currentLevel === 5 || currentLevel === 8) {
    newStars = newStars + 1;
  }

  // Update lives/stars first if changed
  if (newLives !== gameState.lives || newStars !== gameState.stars) {
     await updateDoc(doc(db, 'rooms', gameState.id), { lives: newLives, stars: newStars });
  }

  await startLevel(gameState.id, nextLvl, gameState.players);
};

export const resetToLobby = async (roomId: string) => {
  await updateDoc(doc(db, 'rooms', roomId), {
    status: 'lobby',
    level: 1,
    lives: INITIAL_LIVES,
    stars: 0,
    starBlocked: false,
    lastPlayedCard: 0,
    playedCardsHistory: [],
    starVote: null,
    lastEvent: { type: 'play', message: 'Reset to Lobby', timestamp: Date.now() } as GameEvent
  });
};