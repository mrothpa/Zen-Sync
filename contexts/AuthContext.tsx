import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInAnonymously, 
  updateProfile, 
  GoogleAuthProvider, 
  linkWithPopup, 
  EmailAuthProvider,
  linkWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  linkGoogle: () => Promise<void>;
  linkEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        // Silent Anonymous Login
        console.log("No user found, signing in anonymously...");
        try {
          await signInAnonymously(auth);
          // Listener will trigger again with new user
        } catch (error) {
          console.error("Anonymous login failed", error);
          setLoading(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Smart Google Auth: Try to Link -> Fallback to Login
  const linkGoogle = async () => {
    if (!auth.currentUser) return;
    const provider = new GoogleAuthProvider();
    try {
        // 1. Try to upgrade anonymous account
        const result = await linkWithPopup(auth.currentUser, provider);
        setUser(result.user);
    } catch (error: any) {
        if (error.code === 'auth/credential-already-in-use') {
            // 2. Account exists -> Switch to that account (Login)
            await signInWithPopup(auth, provider);
        } else {
            throw error;
        }
    }
  };

  // Upgrade Anonymous to Email Account
  const linkEmail = async (email: string, pass: string, name: string) => {
    if (!auth.currentUser) return;
    
    const credential = EmailAuthProvider.credential(email, pass);

    try {
        // 1. Try to Link
        const result = await linkWithCredential(auth.currentUser, credential);
        
        // 2. Update Name
        await updateProfile(result.user, { displayName: name });
        setUser({ ...result.user, displayName: name });

    } catch (error: any) {
        if (error.code === 'auth/credential-already-in-use') {
             // Fallback: This email exists, try to sign in normally
             // Note: This replaces the anonymous session
             const result = await signInWithCredential(auth, credential);
             setUser(result.user);
        } else {
            throw error;
        }
    }
  };

  // Standard Login for existing users
  const loginEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
      await signOut(auth);
      // Listener handles re-login as anon
  };

  return (
    <AuthContext.Provider value={{ user, loading, linkGoogle, linkEmail, loginEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};