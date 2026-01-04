import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  value: number;
  onClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  isRecent?: boolean;
}

// Cast motion.div to any to resolve TypeScript errors where props like layoutId/initial
// are not recognized on the types in this environment.
const MotionDiv = motion.div as any;

const Card: React.FC<CardProps> = ({ value, onClick, disabled, isPlayable, isRecent }) => {
  const [isShaking, setIsShaking] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    
    // If playable, trigger the parent click handler.
    // If NOT playable (meaning it's a higher card than the lowest), trigger shake.
    if (isPlayable) {
      onClick?.();
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <MotionDiv
      layoutId={`card-${value}`}
      initial={isRecent ? { scale: 1.5, rotate: Math.random() * 20 - 10, opacity: 0 } : { opacity: 0, y: 20 }}
      animate={
        isShaking 
          ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } } // Shake animation
          : isPlayable && !disabled
            ? { scale: 1.1, y: -15, opacity: 1, rotate: 0 } // Playable Highlight (popped up)
            : { scale: 1, y: 0, opacity: 1, rotate: 0 } // Standard state
      }
      exit={{ opacity: 0, scale: 0.5 }}
      whileHover={!disabled && isPlayable ? { scale: 1.15, y: -20 } : {}}
      whileTap={!disabled && isPlayable ? { scale: 0.95 } : {}}
      onClick={handleClick}
      className={`
        relative min-w-[5rem] w-24 h-36 md:w-32 md:h-48 rounded-2xl flex items-center justify-center
        select-none cursor-pointer snap-center shrink-0
        transition-shadow duration-300
        ${disabled 
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' // Game Over / Lobby state
          : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 border border-white/20' // Standard Playing State
        }
      `}
    >
      {/* Center Number */}
      <span className="text-4xl md:text-6xl font-bold font-mono tracking-tighter z-10">
        {value}
      </span>

      {/* Corner Numbers */}
      <span className="absolute top-2 left-3 text-sm opacity-50 font-bold">{value}</span>
      <span className="absolute bottom-2 right-3 text-sm opacity-50 font-bold rotate-180">{value}</span>
      
      {/* Material You Elevation Overlay (Light/Shadow effect) */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
      
      {/* Subtle shine for playable cards */}
      {isPlayable && !disabled && (
        <div className="absolute inset-0 rounded-2xl bg-white/5 pointer-events-none" />
      )}
    </MotionDiv>
  );
};

export default Card;