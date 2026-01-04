import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, linkGoogle, linkEmail, loginEmail, logout } = useAuth();
  
  // Mode: 'link' (Sign Up/Upgrade) vs 'login' (Sign In existing)
  const [isLoginMode, setIsLoginMode] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(user?.displayName || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
        setError('');
        setIsLoginMode(false); // Default to Link mode (Upgrade) usually better for game context
        setName(user?.displayName || '');
        setEmail('');
        setPassword('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const isAnonymous = user?.isAnonymous;

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await linkGoogle();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!email || !password) {
        setError("Please enter email and password.");
        return;
    }
    if (!isLoginMode && !name) {
        setError("Please enter a name.");
        return;
    }

    setLoading(true);
    try {
      if (isLoginMode) {
        // Regular Login
        await loginEmail(email, password);
      } else {
        // Link / Sign Up
        await linkEmail(email, password, name);
      }
      onClose();
    } catch (e: any) {
      // Map Firebase errors to user friendly messages
      if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
          setError("Invalid email or password.");
      } else if (e.code === 'auth/email-already-in-use') {
          setError("Email already in use. Try logging in.");
      } else {
          setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
      await logout();
      onClose();
  };

  const handleContentClick = (e: React.MouseEvent) => {
      e.stopPropagation();
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all"
        onClick={onClose}
    >
      <div 
        onClick={handleContentClick}
        className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-100 relative animate-[scaleIn_0.2s_ease-out]"
      >
        
        {/* Close Button */}
        <button 
           onClick={onClose}
           className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-50"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
           </svg>
        </button>

        <div className="text-center mb-8">
           <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm
                ${isAnonymous ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
              {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                  user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?'
              )}
           </div>
           
           <h1 className="text-2xl font-bold text-slate-800">
             {isAnonymous 
                ? (isLoginMode ? 'Welcome Back' : 'Save your Game') 
                : 'Account Verified'}
           </h1>
           <p className="text-slate-500 text-sm mt-1">
             {isAnonymous 
               ? (isLoginMode ? 'Log in to access your account.' : 'Create an account to save progress.') 
               : user?.email || user?.displayName}
           </p>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm text-center border border-rose-100">{error}</div>}

        {isAnonymous ? (
            <div className="space-y-6">
                {/* Google Button - Always available as it handles both link and login internally */}
                <button
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full py-3 rounded-xl border border-slate-200 flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors text-slate-700 font-medium bg-white shadow-sm"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                        <path fill="#EA4335" d="M12 4.66c1.61 0 3.06.55 4.21 1.64l3.16-3.16C17.45 1.32 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink mx-4 text-slate-300 text-xs uppercase font-bold tracking-wider">Or with Email</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <AnimatePresence>
                        {!isLoginMode && (
                            <motion.input 
                                initial={{ height: 0, opacity: 0, padding: 0 }}
                                animate={{ height: 'auto', opacity: 1, padding: '0.75rem 1rem' }}
                                exit={{ height: 0, opacity: 0, padding: 0 }}
                                type="text" 
                                placeholder="Your Name" 
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        )}
                    </AnimatePresence>
                    
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button 
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${COLORS.primary} hover:brightness-110 active:scale-95`}
                    >
                        {loading 
                          ? 'Processing...' 
                          : (isLoginMode ? 'Log In' : 'Create Account')
                        }
                    </button>
                </form>

                {/* Toggle Mode */}
                <div className="text-center">
                    <button 
                        type="button"
                        onClick={() => setIsLoginMode(!isLoginMode)}
                        className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                    >
                        {isLoginMode 
                            ? "Don't have an account? Sign Up" 
                            : "Already have an account? Log In"
                        }
                    </button>
                </div>
            </div>
        ) : (
            <div className="space-y-4">
                 <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-center border border-emerald-100">
                    <p className="font-bold">You are logged in.</p>
                    <p className="text-sm opacity-80">Your progress is being saved.</p>
                 </div>
                 <button 
                    onClick={handleLogout}
                    className="w-full py-3 rounded-xl text-rose-600 font-medium hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
                 >
                    Sign Out
                 </button>
            </div>
        )}
      </div>
      <style>{`
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AuthModal;