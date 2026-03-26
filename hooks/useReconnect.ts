import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export const useReconnect = (setRoomId: (id: string | null) => void) => {
  const { user, loading: authLoading } = useAuth();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    // Wait for auth to be ready
    if (authLoading) return;

    const checkReconnection = async () => {
      const storedRoomId = localStorage.getItem('activeRoomId');

      if (!storedRoomId || !user) {
        setIsRestoring(false);
        return;
      }

      try {
        console.log(`[Reconnect] Found stored Room ID: ${storedRoomId}. Checking validity...`);
        const roomRef = doc(db, 'rooms', storedRoomId);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          
          // Check if user is actually part of this room
          const isPlayerInRoom = roomData.players?.some((p: any) => p.uid === user.uid);

          if (isPlayerInRoom && roomData.status !== 'game_over' && roomData.status !== 'victory') {
             console.log('[Reconnect] Reconnection successful.');
             setRoomId(storedRoomId);
          } else {
             console.log('[Reconnect] Room valid, but user not in it or game ended. Clearing storage.');
             localStorage.removeItem('activeRoomId');
          }
        } else {
          console.log('[Reconnect] Room does not exist anymore. Clearing storage.');
          localStorage.removeItem('activeRoomId');
        }
      } catch (error) {
        console.error('[Reconnect] Failed to restore session:', error);
        localStorage.removeItem('activeRoomId');
      } finally {
        setIsRestoring(false);
      }
    };

    checkReconnection();
  }, [user, authLoading, setRoomId]);

  return { isRestoring };
};
