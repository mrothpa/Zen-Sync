import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants';

interface ProfileProps {
  onClose: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onClose }) => {
  const { user, linkGoogle, linkEmail, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(user?.displayName || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isAnonymous = user?.isAnonymous;

  const handleGoogleLink = async () => {
    setError('');
    setLoading(true);
    try {
      await linkGoogle();
      setSuccess('Successfully linked Google account!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
        setError("Please fill in all fields.");
        return;
    }
    setError('');
    setLoading(true);
    try {
      await linkEmail(email, password, name);
      setSuccess('Account upgraded successfully!');
      setEmail('');
      setPassword('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md border border-slate-100 relative">
        
        {/* Back Button */}
        <button 
           onClick={onClose}
           className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
           </svg>
        </button>

        <div className="text-center mb-8">
           <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 font-bold text-3xl">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
           </div>
           <h1 className="text-2xl font-bold text-slate-800">
             {isAnonymous ? 'Guest Account' : 'Verified Account'}
           </h1>
           <p className="text-slate-500 text-sm mt-1">
             {isAnonymous 
               ? 'Upgrade to save your stats and name permanently.' 
               : `Signed in as ${user?.email || user?.displayName}`}
           </p>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm text-center">{error}</div>}
        {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm text-center">{success}</div>}

        {isAnonymous ? (
            <div className="space-y-6">
                
                {/* Google Button */}
                <button
                    onClick={handleGoogleLink}
                    disabled={loading}
                    className="w-full py-3 rounded-xl border border-slate-200 flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors text-slate-700 font-medium"
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
                    <span className="flex-shrink mx-4 text-slate-300 text-xs uppercase">Or with Email</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailLink} className="space-y-3">
                    <input 
                        type="text" 
                        placeholder="Your Name" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${COLORS.primary} hover:brightness-110`}
                    >
                        {loading ? 'Linking...' : 'Save Account'}
                    </button>
                </form>
            </div>
        ) : (
            <div className="space-y-4">
                 <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-center">
                    <p className="font-bold">You are verified!</p>
                    <p className="text-sm opacity-80">Your stats are safe.</p>
                 </div>
                 <button 
                    onClick={() => logout()}
                    className="w-full py-3 rounded-xl text-rose-600 font-medium hover:bg-rose-50 transition-colors"
                 >
                    Sign Out
                 </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Profile;