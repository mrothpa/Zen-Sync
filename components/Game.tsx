
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, Player, GameEventType } from '../types';
import { playCard, nextLevel, resetToLobby, proposeStar, submitStarVote, leaveRoom, sendReaction } from '../services/gameService';
import { triggerErrorVibration, triggerSuccessVibration } from '../services/haptics';
import Card from './Card';
import NinjaStarAction from './NinjaStarAction';
import ReactionOverlay from './ReactionOverlay';
import { COLORS } from '../constants';

interface GameProps {
  gameState: GameState;
  currentUser: any;
  onLeave: () => void;
  onOpenProfile: () => void;
}

const MotionDiv = motion.div as any;

const Game: React.FC<GameProps> = ({ gameState, currentUser, onLeave, onOpenProfile }) => {
  const [myPlayer, setMyPlayer] = useState<Player | undefined>();
  const [feedback, setFeedback] = useState<{ type: GameEventType, message: string } | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  // Emoji Cooldown State
  const [emojiCooldown, setEmojiCooldown] = useState(false);

  useEffect(() => {
    setMyPlayer(gameState.players.find(p => p.uid === currentUser.uid));
  }, [gameState, currentUser]);

  useEffect(() => {
    if (gameState.lastEvent) {
      const event = gameState.lastEvent;
      console.log('[Game] Event received:', event.type, event.timestamp);

      // Haptics
      if (['mistake', 'game_over'].includes(event.type)) {
        triggerErrorVibration();
      } else if (['level_complete', 'victory'].includes(event.type)) {
        triggerSuccessVibration();
      }

      if (['mistake', 'level_complete', 'game_over', 'victory', 'star_used'].includes(event.type)) {
        setFeedback({ type: event.type, message: event.message });
        if (['mistake', 'level_complete', 'star_used'].includes(event.type)) {
           const timer = setTimeout(() => setFeedback(null), 3000);
           return () => clearTimeout(timer);
        }
      }
    }
  }, [gameState.lastEvent?.timestamp]);

  const lowestCard = myPlayer?.hand && myPlayer.hand.length > 0 
    ? Math.min(...myPlayer.hand) 
    : null;

  const handlePlayCard = (card: number) => {
    if (!myPlayer) return;
    
    // Strict Client-Side Validation
    if (gameState.status !== 'playing' || card !== lowestCard) {
      return; 
    }

    // --- Haptics: Optimistic Check for Active Player ---
    // Check if anyone else has a lower card => Mistake!
    const otherPlayers = gameState.players.filter(p => p.uid !== myPlayer.uid);
    const mistakeFound = otherPlayers.some(p => p.hand.some(c => c < card));
    
    if (mistakeFound) {
      console.log('[Game] Local mistake detection. Triggering immediate vibration.');
      triggerErrorVibration();
    }
    // --------------------------------------------------

    playCard(gameState.id, myPlayer.uid, card);
  };

  const handleNextLevel = () => {
    if (myPlayer?.isHost) {
      nextLevel(gameState);
      setFeedback(null);
    }
  };

  const handleBackToLobby = () => {
    if (myPlayer?.isHost) {
      resetToLobby(gameState.id);
    }
  };

  const handleRestartGame = () => {
    if (myPlayer?.isHost) {
       import('../services/gameService').then(mod => {
          mod.startGame(gameState.id, gameState.players);
       });
    }
  };

  // --- Star / Ninja Logic ---
  const handleProposeStar = () => {
    if (gameState.stars > 0 && !gameState.starVote && !gameState.starBlocked && myPlayer) {
      proposeStar(gameState.id, myPlayer);
    }
  };

  const handleVote = (approved: boolean) => {
    if (myPlayer) {
      submitStarVote(gameState.id, myPlayer.uid, approved);
    }
  };

  const handleLeaveGame = async () => {
      try {
          await leaveRoom(gameState.id, currentUser.uid);
          onLeave(); // Reset local state
      } catch (e) {
          console.error("Failed to leave room:", e);
      }
  };

  // --- Emoji Logic ---
  const handleSendReaction = (emoji: string) => {
      if (emojiCooldown || !myPlayer) return;
      
      sendReaction(gameState.id, emoji, myPlayer);
      
      setEmojiCooldown(true);
      setTimeout(() => setEmojiCooldown(false), 3000); // 3s Cooldown
  };

  // Check if active vote needs my attention
  const activeVote = gameState.starVote;
  const isMyProposal = activeVote?.requesterUid === currentUser.uid;
  const hasVoted = activeVote?.approvedBy.includes(currentUser.uid);
  const showVoteModal = activeVote && !isMyProposal && !hasVoted;
  const showWaitingForVote = activeVote && (isMyProposal || hasVoted);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden relative transition-colors duration-500 pointer-events-none">
      
      {/* --- Reaction Overlay (Visuals) --- */}
      <ReactionOverlay roomId={gameState.id} />

      {/* --- Error Pulse --- */}
      <AnimatePresence>
        {feedback?.type === 'mistake' && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-rose-500 z-0 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* --- Header / HUD --- */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex gap-4 items-center">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Level</span>
            <span className="text-3xl font-light text-slate-800">{gameState.level}</span>
          </div>
          
          <div className="flex gap-2 pointer-events-auto">
            {/* Lives Chip */}
            <div className="flex items-center gap-2 bg-rose-100 border border-rose-200 px-3 py-1 rounded-xl shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-rose-600">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              <span className="text-lg font-bold text-rose-900">{gameState.lives}</span>
            </div>

            {/* Ninja Star Action Component */}
            <NinjaStarAction 
               stars={gameState.stars}
               disabled={gameState.stars === 0 || gameState.status !== 'playing' || !!gameState.starVote || !!gameState.starBlocked}
               isVoting={!!gameState.starVote}
               isBlocked={!!gameState.starBlocked}
               onPropose={handleProposeStar}
            />
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
            {/* Profile Button - Small and Unobtrusive */}
            <button 
                onClick={onOpenProfile}
                className="mb-2 p-1.5 bg-white/50 backdrop-blur rounded-full hover:bg-white transition-colors"
                title="Profile"
            >
                {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                        {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                )}
            </button>

          {gameState.players.map(p => (
             p.uid !== currentUser.uid && (
               <div key={p.uid} className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                 <span className="text-sm font-medium text-slate-700">{p.name}</span>
                 <div className="flex gap-0.5">
                   {Array.from({ length: p.hand.length }).map((_, i) => (
                     <div key={i} className="w-2 h-3 bg-indigo-300 rounded-[1px]" />
                   ))}
                 </div>
               </div>
             )
          ))}
        </div>
      </div>
      
      {/* --- RIGHT SIDE EMOJI BAR --- */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto z-50">
          {['🤯', '👍', '🙏'].map((emoji) => (
             <motion.button
                key={emoji}
                whileTap={!emojiCooldown ? { scale: 0.9 } : {}}
                whileHover={!emojiCooldown ? { scale: 1.1 } : {}}
                onClick={() => handleSendReaction(emoji)}
                disabled={emojiCooldown}
                className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg border border-white/20 transition-all
                    ${emojiCooldown 
                        ? 'bg-slate-200 opacity-50 cursor-not-allowed grayscale' 
                        : 'bg-[#01323F] text-[#F2FCFF] cursor-pointer hover:bg-[#024456]'
                    }
                `}
             >
                 {emoji}
             </motion.button>
          ))}
      </div>

      {/* --- Snackbar --- */}
      <AnimatePresence>
        {feedback && !['game_over', 'victory'].includes(feedback.type) && (
          <MotionDiv
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className={`absolute top-24 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-3
              ${feedback.type === 'mistake' ? 'bg-rose-100 border-rose-200 text-rose-800' : 
                feedback.type === 'star_used' ? 'bg-amber-100 border-amber-200 text-amber-800' :
                'bg-emerald-100 border-emerald-200 text-emerald-800'}
            `}
          >
            {feedback.message}
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* --- Play Area --- */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        
        {/* Modals & Overlays */}
        <AnimatePresence>
            {/* Confirmation Modal for Leaving */}
            {showLeaveConfirm && (
                <MotionDiv
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-50 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-slate-200 max-w-sm text-center pointer-events-auto"
                >
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Leave Game?</h3>
                    <p className="text-slate-500 text-sm mb-4">This will remove you from the session. Are you sure?</p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setShowLeaveConfirm(false)} 
                            className="px-5 py-2 rounded-full bg-slate-100 text-slate-600 font-medium hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleLeaveGame} 
                            className="px-5 py-2 rounded-full bg-rose-500 text-white font-medium hover:bg-rose-600"
                        >
                            Leave
                        </button>
                    </div>
                </MotionDiv>
            )}

            {/* Voting Modal (Yes/No) */}
            {showVoteModal && (
                <MotionDiv
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-40 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-slate-200 max-w-sm text-center pointer-events-auto"
                >
                    <div className="mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Ninja Star?</h3>
                        <p className="text-slate-500 text-sm mt-1">{activeVote?.requesterName} wants to sync up.</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => handleVote(false)} className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors">No</button>
                        <button onClick={() => handleVote(true)} className="px-5 py-2.5 rounded-full bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200">Yes</button>
                    </div>
                </MotionDiv>
            )}

            {/* Waiting for Votes Overlay */}
            {showWaitingForVote && (
                 <MotionDiv
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-30 bottom-1/2 translate-y-24 bg-slate-800/90 text-white px-6 py-2 rounded-full text-sm font-medium backdrop-blur-sm flex items-center gap-2 shadow-lg"
                >
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    Waiting for team vote...
                </MotionDiv>
            )}

            {/* Level Complete / Game Over / Victory Modals */}
          {gameState.status === 'level_complete' && (
             <MotionDiv 
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               className="absolute z-20 flex flex-col items-center gap-4 bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-emerald-100 max-w-sm text-center pointer-events-auto"
             >
               <h2 className="text-3xl font-light text-emerald-800">Level Complete!</h2>
               <p className="text-slate-500">Sync achieved. Prepare for Level {gameState.level + 1}.</p>
               {myPlayer?.isHost ? (
                 <button 
                   onClick={handleNextLevel}
                   className={`${COLORS.primary} ${COLORS.onPrimary} px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all`}
                 >
                   Start Level {gameState.level + 1}
                 </button>
               ) : (
                 <p className="text-slate-400 text-sm animate-pulse">Waiting for host...</p>
               )}
               {/* Leave Button for Level Complete Pauses */}
               <button 
                  onClick={() => setShowLeaveConfirm(true)}
                  className="mt-2 text-slate-400 text-sm hover:text-slate-600 transition-colors"
               >
                  Leave Game
               </button>
             </MotionDiv>
          )}

          {gameState.status === 'game_over' && (
             <MotionDiv 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="absolute z-20 flex flex-col items-center gap-4 bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-rose-100 max-w-sm text-center pointer-events-auto"
             >
               <h2 className="text-3xl font-light text-rose-800">Connection Lost</h2>
               <p className="text-slate-600">The group ran out of lives at Level {gameState.level}.</p>
               {myPlayer?.isHost ? (
                 <div className="flex flex-col gap-2 w-full">
                    <button 
                       onClick={handleRestartGame} 
                       className={`${COLORS.primary} ${COLORS.onPrimary} w-full px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all`}
                    >
                      Try Again
                    </button>
                    {/* Back to Home Logic */}
                    <button 
                       onClick={onLeave}
                       className="text-slate-500 hover:bg-slate-100 px-6 py-2 rounded-full text-sm transition-colors"
                    >
                      Main Menu
                    </button>
                 </div>
               ) : (
                 <div className="flex flex-col gap-2">
                    <p className="text-slate-500 text-sm animate-pulse">Waiting for host...</p>
                    <button onClick={onLeave} className="text-slate-400 hover:text-slate-600 text-xs mt-2 underline">Main Menu</button>
                 </div>
               )}
             </MotionDiv>
          )}

          {gameState.status === 'victory' && (
             <MotionDiv 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="absolute z-20 flex flex-col items-center gap-6 bg-amber-50/95 backdrop-blur-md p-10 rounded-[2.5rem] shadow-2xl border border-amber-200 max-w-md text-center pointer-events-auto"
             >
               <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                 <span className="text-4xl">🏆</span>
               </div>
               <div>
                  <h2 className="text-4xl font-bold text-amber-900 tracking-tight mb-2">Mission Complete</h2>
                  <p className="text-amber-700/80">You have successfully synchronized through all 12 levels.</p>
               </div>
               
               {myPlayer?.isHost ? (
                 <div className="flex flex-col gap-3 w-full">
                    <button 
                       onClick={handleRestartGame}
                       className="bg-amber-600 text-white w-full px-6 py-4 rounded-xl font-bold shadow-lg hover:bg-amber-700 transition-all"
                    >
                      Play Again
                    </button>
                    {/* Back to Home Logic */}
                    <button 
                       onClick={onLeave}
                       className="text-amber-800 hover:bg-amber-100 px-6 py-2 rounded-full text-sm font-medium transition-colors"
                    >
                      Main Menu
                    </button>
                 </div>
               ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-amber-500 text-sm animate-pulse">Waiting for host...</p>
                    <button onClick={onLeave} className="text-amber-700/50 hover:text-amber-800 text-xs mt-2 underline">Main Menu</button>
                 </div>
               )}
             </MotionDiv>
          )}
        </AnimatePresence>

        {/* Stack */}
        <div className="relative w-40 h-56 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center">
               <span className="text-slate-300 font-bold text-xl uppercase tracking-widest">Stack</span>
            </div>

            <AnimatePresence mode='popLayout'>
              {gameState.lastPlayedCard > 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                   <Card 
                     key={gameState.lastPlayedCard} 
                     value={gameState.lastPlayedCard} 
                     disabled={true} 
                     isRecent={true}
                   />
                </div>
              )}
            </AnimatePresence>
        </div>
      </div>

      {/* Footer: Hand Container */}
      <div className="h-1/3 w-full bg-slate-100/50 border-t border-slate-200 relative z-10 backdrop-blur-md pointer-events-auto">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-1 rounded-full text-xs shadow-md z-20">
           Your Hand
        </div>
        
        {/* Horizontal Scrolling Card Strip */}
        <div className="h-full flex items-center gap-4 px-8 pb-4 pt-8 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide w-full justify-start md:justify-center">
           <AnimatePresence>
             {myPlayer?.hand.map((cardValue) => (
               <Card
                 key={cardValue}
                 value={cardValue}
                 isPlayable={gameState.status === 'playing' && cardValue === lowestCard}
                 onClick={() => handlePlayCard(cardValue)}
                 disabled={gameState.status !== 'playing'}
               />
             ))}
           </AnimatePresence>
           
           {myPlayer?.hand.length === 0 && gameState.status === 'playing' && (
             <div className="w-full flex justify-center">
               <span className="text-slate-400 italic">Hand empty. Focus...</span>
             </div>
           )}
        </div>
      </div>
      
      {/* Custom Scrollbar Hiding Styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Game;
