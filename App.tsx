import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Home from './components/Home';
import Game from './components/Game';
import AuthModal from './components/AuthModal';
import { GameState } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useReconnect } from './hooks/useReconnect';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Auto-Reconnect Hook
  const { isRestoring } = useReconnect(setRoomId);

  // Persistence Wrapper
  const updateRoomId = (id: string | null) => {
    setRoomId(id);
    if (id) {
        localStorage.setItem('activeRoomId', id);
    } else {
        localStorage.removeItem('activeRoomId');
    }
  };

  // Game State Listener
  useEffect(() => {
    if (!roomId) {
      setGameState(null);
      return;
    }

    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        setGameState(doc.data() as GameState);
      } else {
        // Room deleted or invalid
        updateRoomId(null);
        setGameState(null);
      }
    });

    return unsubscribe;
  }, [roomId]);

  const handleExitGame = () => {
    updateRoomId(null);
    setGameState(null);
  };

  // Global Loading State (Auth + Reconnect Check)
  if (authLoading || isRestoring) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
             {isRestoring && <span className="text-slate-400 text-sm animate-pulse">Restoring session...</span>}
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      
      {user && gameState && gameState.status !== 'lobby' ? (
         <Game 
            gameState={gameState} 
            currentUser={user} 
            onLeave={handleExitGame} 
            onOpenProfile={() => setIsAuthModalOpen(true)}
         />
      ) : (
         <Home 
            setRoomId={updateRoomId} 
            gameState={gameState} 
            onOpenProfile={() => setIsAuthModalOpen(true)}
         />
      )}
    </>
  );
}

// Main App Wrapper
function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;