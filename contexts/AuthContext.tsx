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
    const provider = new GoogleAuthProvider();
    
    // Case 1: No current user -> Just Login
    if (!auth.currentUser) {
       await signInWithPopup(auth, provider);
       return;
    }

    // Case 2: Anonymous User -> Try to Link, Fallback to Login
    try {
        const result = await linkWithPopup(auth.currentUser, provider);
        setUser(result.user);
    } catch (error: any) {
        console.log("Google Link Failed:", error.code, error.message);
        
        // Error codes that indicate the account already exists
        if (error.code === 'auth/credential-already-in-use' || error.code === 'auth/email-already-in-use') {
            console.log("Account exists. Switching to login...");
            
            // Try to extract credential using the modular SDK method
            const credential = GoogleAuthProvider.credentialFromError(error);
            
            if (credential) {
               console.log("Using extracted credential to sign in (no popup needed)...");
               try {
                  const result = await signInWithCredential(auth, credential);
                  setUser(result.user);
                  return;
               } catch (credError) {
                  console.error("Sign in with extracted credential failed", credError);
                  // proceed to fallback
               }
            } else {
                console.log("No credential found in error object.");
            }

            // Fallback: Force fresh login with the provider (might be blocked by browser)
            try {
                await signInWithPopup(auth, provider);
            } catch (loginError: any) {
                console.error("Fallback Login failed:", loginError);
                throw loginError;
            }
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