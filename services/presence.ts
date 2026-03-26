import { ref, onValue, onDisconnect, set, serverTimestamp, off } from 'firebase/database';
import { rtdb } from '../firebase';

/**
 * Sets up the presence system for a user in a specific room.
 * Handles automatic 'offline' updates on disconnect (tab close/refresh).
 */
export const setupPresence = (roomId: string, userId: string) => {
    // 1. Reference to the special '.info/connected' path in RTDB
    // This path returns true when the client establishes a websocket connection
    const connectedRef = ref(rtdb, '.info/connected');
    
    // 2. Reference to this user's status in the specific room
    const userStatusRef = ref(rtdb, `/status/${roomId}/${userId}`);

    // 3. Listen for connection state changes
    const unsubscribe = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            // We are connected!
            
            // a) Configure the onDisconnect hook FIRST.
            // This ensures that if the connection drops immediately after, the server knows what to do.
            onDisconnect(userStatusRef).set({
                state: 'offline',
                lastChanged: serverTimestamp()
            }).then(() => {
                // b) Now mark ourselves as online
                set(userStatusRef, {
                    state: 'online',
                    lastChanged: serverTimestamp()
                });
            });
        }
    });

    return () => {
        unsubscribe(); // Stop listening to .info/connected
        
        // We do NOT manually set offline or cancel onDisconnect here.
        // We rely entirely on the server-side onDisconnect hook attached to the socket.
        // When the browser closes/reloads, the socket disconnects, and the server runs the update.
    };
};

/**
 * Subscribes to the presence status of all users in a room.
 * Returns a map of userId -> isOnline (boolean).
 */
export const subscribeToRoomPresence = (roomId: string, onUpdate: (presenceMap: Record<string, boolean>) => void) => {
    const roomStatusRef = ref(rtdb, `/status/${roomId}`);
    
    const unsubscribe = onValue(roomStatusRef, (snapshot) => {
        const val = snapshot.val();
        console.log("Raw RTDB Data for Room: ", val);
        
        if (!val) {
            onUpdate({});
            return;
        }

        const onlineMap: Record<string, boolean> = {};
        Object.keys(val).forEach(key => {
            // Check strictly for state === 'online'
            onlineMap[key] = val[key].state === 'online';
        });
        onUpdate(onlineMap);
    });

    return unsubscribe;
};
