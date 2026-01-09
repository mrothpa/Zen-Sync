
import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  runTransaction,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  increment,
  addDoc
} from 'firebase/firestore';
import { GameState, Player, GameEvent, GameStatus, StarVote, MatchData, Reaction } from '../types';
import { INITIAL_LIVES, MAX_LEVEL, MAX_PLAYERS, MAX_LIVES } from '../constants';

// --- Utility: Deck Generation ---
const generateDeck = () => Array.from({ length: 100 }, (_, i) => i + 1);

const calculateInitialLives = (playerCount: number): number => {
  return Math.min(playerCount + 1, MAX_LIVES); 
};

const calculateInitialStars = (playerCount: number): number => {
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
    // Init Stats
    startTime: Date.now(),
    errorsMade: 0,
    starsUsed: 0,
    starsEfficiency: 0
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
    startTime: Date.now(), // Reset stats on fresh start
    errorsMade: 0,
    starsUsed: 0,
    starsEfficiency: 0,
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
    starVote: null, 
    starBlocked: false,
    lastEvent: {
      type: 'play',
      message: `Level ${level} Started`,
      timestamp: Date.now()
    } as GameEvent
  });
};

// --- CORE LOGIC: Play Card with Tracking & Finalization ---

export const playCard = async (roomId: string, playerUid: string, card: number) => {
  const roomRef = doc(db, 'rooms', roomId);
  let finalStateForArchive: GameState | null = null;

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

      // 3. Update Lives, Status & Stats
      let newLives = gameState.lives;
      let newStatus: GameStatus = gameState.status;
      let newLastEvent: GameEvent;
      const timestamp = Date.now();
      
      // Update Errors Stat
      let newErrorsMade = gameState.errorsMade || 0;

      if (isMistake) {
        newLives = gameState.lives - 1;
        newErrorsMade += 1; // Track Error
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

      // 6. Prepare Updates
      // Logic Fix: Add dropped cards to history so they are "played" before the high card
      const lowerCardsSorted = lowerCardsFound.sort((a, b) => a - b);
      // We cannot use arrayUnion for multiple custom ordered items easily in one go if we want precise order at the end
      // So we read the current history from gameState (which we have) and append locally.
      const newPlayedCardsHistory = [...gameState.playedCardsHistory, ...lowerCardsSorted, card];

      const updatePayload: any = {
        lives: newLives,
        status: newStatus,
        lastPlayedCard: card,
        playedCardsHistory: newPlayedCardsHistory,
        players: updatedPlayers,
        lastEvent: newLastEvent,
        starBlocked: false,
        errorsMade: newErrorsMade
      };

      transaction.update(roomRef, updatePayload);

      // 7. Check if Game Ended (For Post-Transaction Archiving)
      if (newStatus === 'game_over' || newStatus === 'victory') {
         finalStateForArchive = { ...gameState, ...updatePayload };
      }
    });

    // 8. Execute Archiving OUTSIDE the main transaction to avoid "Reads after Writes"
    if (finalStateForArchive) {
       await archiveMatchAndNotify(finalStateForArchive);
    }

  } catch (e) {
    console.log("Transaction failed: ", e);
  }
};

// --- STAR LOGIC with Tracking ---

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

export const submitStarVote = async (roomId: string, voterUid: string, approved: boolean) => {
  const roomRef = doc(db, 'rooms', roomId);
  let finalStateForArchive: GameState | null = null;
  
  await runTransaction(db, async (transaction) => {
    const sfDoc = await transaction.get(roomRef);
    if (!sfDoc.exists()) throw "Room error";
    const gameState = sfDoc.data() as GameState;

    if (!gameState.starVote) return;

    if (!approved) {
      transaction.update(roomRef, { starVote: null, starBlocked: true });
      return;
    }

    const currentApprovals = gameState.starVote.approvedBy || [];
    if (!currentApprovals.includes(voterUid)) {
       const newApprovals = [...currentApprovals, voterUid];
       const requiredVotes = gameState.players.length - 1;

       if (newApprovals.length >= requiredVotes) {
          // Pass transaction to effect logic
          const resultState = await executeStarEffect(transaction, roomRef, gameState);
          if (resultState) {
            finalStateForArchive = resultState;
          }
       } else {
          transaction.update(roomRef, { "starVote.approvedBy": newApprovals });
       }
    }
  });

  // Execute Archiving OUTSIDE transaction
  if (finalStateForArchive) {
    await archiveMatchAndNotify(finalStateForArchive);
  }
};

const executeStarEffect = async (transaction: any, roomRef: any, gameState: GameState): Promise<GameState | null> => {
  // Logic: Max of min cards
  const lowestCardsPerPlayer: number[] = [];
  gameState.players.forEach(p => {
    if (p.hand.length > 0) lowestCardsPerPlayer.push(Math.min(...p.hand));
  });

  if (lowestCardsPerPlayer.length === 0) {
    transaction.update(roomRef, { starVote: null });
    return null;
  }

  const threshold = Math.max(...lowestCardsPerPlayer);

  // Cards removed logic
  const cardsRemoved: number[] = [];
  const updatedPlayers = gameState.players.map(p => {
    const kept = [];
    for (const c of p.hand) {
      if (c <= threshold) {
        cardsRemoved.push(c);
      } else {
        kept.push(c);
      }
    }
    return { ...p, hand: kept };
  });

  // Track Stats
  const newStarsUsed = (gameState.starsUsed || 0) + 1;
  const newStarsEfficiency = (gameState.starsEfficiency || 0) + cardsRemoved.length;

  // Level Completion Check
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
    newLastEvent = {
      type: 'star_used',
      message: `Ninja Star! Dropped cards <= ${threshold}.`,
      timestamp: Date.now(),
      data: { removedCards: cardsRemoved, threshold }
    };
  }

  // Logic Fix: Update stack with removed cards
  const sortedRemoved = cardsRemoved.sort((a, b) => a - b);
  const newPlayedCardsHistory = [...gameState.playedCardsHistory, ...sortedRemoved];

  const updatePayload: any = {
    stars: Math.max(0, gameState.stars - 1),
    starVote: null,
    players: updatedPlayers,
    status: newStatus,
    lastEvent: newLastEvent,
    starsUsed: newStarsUsed,
    starsEfficiency: newStarsEfficiency,
    lastPlayedCard: threshold, // Set top card to the highest removed one
    playedCardsHistory: newPlayedCardsHistory
  };

  transaction.update(roomRef, updatePayload);

  // Return full state if game ended, for archiving logic
  if (newStatus === 'game_over' || newStatus === 'victory') {
    return { ...gameState, ...updatePayload };
  }
  return null;
};

// --- EMOJI REACTIONS ---
export const sendReaction = async (roomId: string, emoji: string, sender: Player) => {
    const reactionsRef = collection(db, 'rooms', roomId, 'reactions');
    const reaction: Omit<Reaction, 'id'> = {
        emoji,
        senderId: sender.uid,
        senderName: sender.name,
        timestamp: Date.now()
    };
    // Add to subcollection (Auto ID)
    await addDoc(reactionsRef, reaction);
};

// --- STATS & ARCHIVING ---

/**
 * SEPARATE TRANSACTION for Stats Archiving.
 * Ensures "Reads before Writes" rule is respected by separating
 * gameplay logic (which writes game state) from stat logic (which reads users then writes stats).
 */
const archiveMatchAndNotify = async (finalState: GameState) => {
    const matchId = `${finalState.id}_${Date.now()}`;
    const matchRef = doc(db, 'matches', matchId);
    
    // Prepare Match Data immediately
    const matchData: MatchData = {
        matchId: matchId,
        playerIds: finalState.players.map(p => p.uid),
        playerNames: finalState.players.map(p => p.name),
        result: finalState.status === 'victory' ? 'victory' : 'game_over',
        levelReached: finalState.level,
        livesLeft: finalState.lives,
        starsUsed: finalState.starsUsed || 0,
        starsEfficiency: finalState.starsEfficiency || 0,
        errorsMade: finalState.errorsMade || 0,
        startTime: finalState.startTime,
        endTime: Date.now(),
        durationSeconds: Math.floor((Date.now() - finalState.startTime) / 1000)
    };

    try {
        await runTransaction(db, async (transaction) => {
            // 1. READ PHASE: Read all user profiles first
            const userReads = await Promise.all(
                finalState.players.map(async (p) => {
                    if (!p.uid) return { uid: null, doc: null };
                    const userRef = doc(db, 'users', p.uid);
                    const userDoc = await transaction.get(userRef);
                    return { uid: p.uid, doc: userDoc, ref: userRef, name: p.name };
                })
            );

            // 2. WRITE PHASE: Write match data
            transaction.set(matchRef, matchData);

            // 3. WRITE PHASE: Update all users
            for (const { uid, doc: userDoc, ref, name } of userReads) {
                if (!uid || !ref) continue;

                if (userDoc && userDoc.exists()) {
                    const userData = userDoc.data();
                    const currentHighLevel = userData.highestLevelReached || 0;
                    
                    const updatePayload: any = {
                        totalGamesPlayed: increment(1)
                    };
                    
                    if (finalState.level > currentHighLevel) {
                        updatePayload.highestLevelReached = finalState.level;
                    }

                    transaction.update(ref, updatePayload);
                } else {
                    // Create basic profile for anon/new users
                    transaction.set(ref, {
                        uid: uid,
                        isAnonymous: true,
                        displayName: name,
                        totalGamesPlayed: 1,
                        highestLevelReached: finalState.level
                    });
                }
            }
        });
        console.log("Match archived successfully.");
    } catch (e) {
        console.error("Failed to archive match:", e);
    }
};

export const getGlobalLeaderboard = async () => {
    // Sort logic: Highest Level > Most Lives Left > Fastest Time > Oldest Date
    const matchesRef = collection(db, 'matches');
    const q = query(
        matchesRef,
        orderBy('levelReached', 'desc'),
        orderBy('livesLeft', 'desc'),
        orderBy('durationSeconds', 'asc'),
        orderBy('endTime', 'asc'),
        limit(50)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MatchData);
};

export const nextLevel = async (gameState: GameState) => {
  const allHandsEmpty = gameState.players.every(p => p.hand.length === 0);
  if (!allHandsEmpty && gameState.status !== 'level_complete') return;

  const currentLevel = gameState.level;
  const nextLvl = currentLevel + 1;
  let newLives = gameState.lives;
  let newStars = gameState.stars;

  if (currentLevel === 3 || currentLevel === 6 || currentLevel === 9) {
    newLives = Math.min(newLives + 1, MAX_LIVES);
  }
  if (currentLevel === 2 || currentLevel === 5 || currentLevel === 8) {
    newStars = newStars + 1;
  }

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
    // Reset Stats for new game
    startTime: Date.now(),
    errorsMade: 0,
    starsUsed: 0,
    starsEfficiency: 0,
    lastEvent: { type: 'play', message: 'Reset to Lobby', timestamp: Date.now() } as GameEvent
  });
};