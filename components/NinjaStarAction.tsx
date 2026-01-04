import React from 'react';
import { motion } from 'framer-motion';

interface NinjaStarActionProps {
  stars: number;
  disabled: boolean;
  isVoting: boolean;
  isBlocked?: boolean;
  onPropose: () => void;
}

const NinjaStarAction: React.FC<NinjaStarActionProps> = ({ stars, disabled, isVoting, isBlocked, onPropose }) => {
  
  // Determine tooltip text
  let statusText = "";
  if (isVoting) statusText = "Voting in progress";
  else if (stars === 0) statusText = "No stars left";
  else if (isBlocked) statusText = "Rejected. Play a card first.";

  return (
    <div className="relative group">
        <motion.button
        whileTap={!disabled ? { scale: 0.95 } : {}}
        onClick={onPropose}
        disabled={disabled}
        className={`
            relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all pointer-events-auto
            ${disabled 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-200 hover:shadow-md cursor-pointer'
            }
        `}
        >
        <div className="relative">
            {/* Star Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${disabled ? 'text-slate-400' : 'text-amber-600'}`}>
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
            </svg>
            
            {/* Spinner if voting */}
            {isVoting && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>

        <span className="hidden md:inline">
            {isVoting ? 'Voting...' : 'Ninja Star'}
        </span>
        
        {/* Badge for count */}
        <span className={`flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs rounded-md ${disabled ? 'bg-slate-200 text-slate-500' : 'bg-amber-600 text-white'}`}>
            {stars}
        </span>
        </motion.button>
        
        {/* Tooltip on Hover (if disabled) */}
        {disabled && statusText && (
            <div className="absolute top-full right-0 mt-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {statusText}
            </div>
        )}
    </div>
  );
};

export default NinjaStarAction;