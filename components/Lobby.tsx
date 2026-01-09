import React, { useState } from 'react';
import { createRoom, joinRoom, toggleReady, startGame, leaveRoom } from '../services/gameService';
import { COLORS, MAX_PLAYERS } from '../constants';
import { GameState } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LobbyProps {
  setRoomId: (id: string | null) => void;
  gameState: GameState | null;
  onOpenProfile: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ setRoomId, gameState, onOpenProfile }) => {
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (gameState?.id) {
       navigator.clipboard.writeText(gameState.id);
       setCopied(true);
       setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const id = await createRoom(user);
      setRoomId(id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !user) return;
    setIsLoading(true);
    try {
      await joinRoom(joinCode.toUpperCase(), user);
      setRoomId(joinCode.toUpperCase());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (gameState) {
      try {
        await startGame(gameState.id, gameState.players);
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  const handleLeaveLobby = async () => {
    if (!gameState || !user) return;
    try {
        await leaveRoom(gameState.id, user.uid);
        setRoomId(null);
    } catch (e: any) {
        setError(e.message);
    }
  };

  // --- Header Profile Component ---
  const HeaderProfile = () => (
      <button 
        onClick={onOpenProfile} 
        className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden border border-slate-100 hover:scale-105 transition-transform group"
        title={user?.isAnonymous ? "Login / Profile" : "Profile"}
      >
        {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
        ) : (
             user?.isAnonymous ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
             ) : (
                <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
             )
        )}
    </button>
  );

  // --- Active Lobby View ---
  if (gameState && user) {
    const isHost = gameState.players.find(p => p.uid === user.uid)?.isHost;
    const allReady = gameState.players.every(p => p.ready);
    const playerCount = gameState.players.length;
    const canStart = allReady && playerCount >= 2;
    const isFull = playerCount >= MAX_PLAYERS;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 relative">
        <HeaderProfile />

        <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md border border-slate-100 relative">
          
          {/* Leave Button */}
          <button 
             onClick={handleLeaveLobby}
             className="absolute top-8 right-8 text-slate-400 hover:text-rose-500 transition-colors"
             title="Leave Room"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
             </svg>
          </button>

          <div className="text-center mb-8">
            <span className="text-slate-400 uppercase tracking-widest text-xs font-bold">Room Code</span>
            
            <div className="flex items-center justify-center gap-3 mt-2 relative">
                {/* Placeholder to balance the layout (invisible) */}
                <div className="w-10 h-10 opacity-0 pointer-events-none" />

                <h1 className="text-5xl font-mono font-bold text-slate-800 tracking-tighter">{gameState.id}</h1>
                
                <button 
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 transition-all w-10 h-10 flex items-center justify-center transform active:scale-95"
                  title="Copy Code"
                >
                  {copied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-500">
                      <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
                    </svg>
                  )}
                </button>
            </div>

            <div className="flex justify-center gap-2 mt-2">
               <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isFull ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                 {playerCount} / {MAX_PLAYERS} Players
               </span>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {gameState.players.map(p => (
              <div key={p.uid} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.ready ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="font-medium text-slate-700">{p.name} {p.isHost && '(Host)'}</span>
                </div>
                {p.uid === user.uid && (
                  <button 
                    onClick={() => toggleReady(gameState.id, user.uid, gameState.players)}
                    className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${p.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {p.ready ? 'READY' : 'NOT READY'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-rose-500 text-center text-sm mb-4">{error}</p>}

          {isHost ? (
            <div className="space-y-2">
              <button
                disabled={!canStart}
                onClick={handleStartGame}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
                  ${canStart 
                    ? `${COLORS.primaryContainer} ${COLORS.onPrimaryContainer} shadow-sm hover:shadow-md hover:brightness-95` 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                {playerCount < 2 ? 'Need 2+ Players' : 'Start Game'}
              </button>
              {!allReady && playerCount >= 2 && (
                <p className="text-center text-xs text-slate-400">Waiting for all players to be READY</p>
              )}
            </div>
          ) : (
             <div className="text-center text-slate-400 text-sm animate-pulse">
               Waiting for host to start...
             </div>
          )}
        </div>
      </div>
    );
  }

  // --- Entry View ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 relative">
      
      <HeaderProfile />

      <div className="max-w-md w-full">
        <div className="text-center mb-12">
           <h1 className="text-6xl font-thin tracking-tighter text-indigo-900 mb-2">the mind</h1>
           <p className="text-slate-500 font-light">Connect. Sync. Survive.</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100/50 border border-white">
          
          <div className="space-y-6">
            <button
              onClick={handleCreate}
              disabled={isLoading || !user}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200`}
            >
              Create Room
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-slate-300 text-sm">OR</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <input
                type="text"
                maxLength={6}
                placeholder="ENTER CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-center font-mono text-xl tracking-widest placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
              />
              <button
                type="submit"
                disabled={isLoading || joinCode.length < 6 || !user}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all 
                  ${joinCode.length === 6 ? `${COLORS.primary} ${COLORS.onPrimary} shadow-lg` : 'bg-slate-200 text-slate-400'}`}
              >
                Join Room
              </button>
            </form>
            
            {error && <p className="text-rose-500 text-center text-sm">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;