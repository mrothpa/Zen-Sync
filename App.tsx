import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Lobby from './components/Lobby';
import Game from './components/Game';
import AuthModal from './components/AuthModal';
import { GameState } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
        setRoomId(null);
        setGameState(null);
      }
    });

    return unsubscribe;
  }, [roomId]);

  const handleExitGame = () => {
    setRoomId(null);
    setGameState(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
         <Lobby 
            setRoomId={setRoomId} 
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