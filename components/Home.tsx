
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lobby from './Lobby';
import StatsDashboard from './StatsDashboard';
import { GameState } from '../types';

interface HomeProps {
  setRoomId: (id: string | null) => void;
  gameState: GameState | null;
  onOpenProfile: () => void;
}

const Home: React.FC<HomeProps> = ({ setRoomId, gameState, onOpenProfile }) => {
  // 0 = Lobby, 1 = Stats
  const [viewIndex, setViewIndex] = useState(0);
  // Direction for animation (-1 left, 1 right)
  const [direction, setDirection] = useState(0);

  const navigateTo = (newIndex: number) => {
      if (newIndex === viewIndex) return;
      const newDirection = newIndex > viewIndex ? 1 : -1;
      setDirection(newDirection);
      setViewIndex(newIndex);
  };

  const paginate = (newDirection: number) => {
    const newIndex = viewIndex + newDirection;
    if (newIndex >= 0 && newIndex <= 1) {
      setDirection(newDirection);
      setViewIndex(newIndex);
    }
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipeConfidenceThreshold = 10000;
    const swipePower = Math.abs(offset.x) * velocity.x;

    if (swipePower < -swipeConfidenceThreshold) {
      // Swipe Left -> Go to Stats (if in Lobby)
      if (viewIndex === 0) paginate(1);
    } else if (swipePower > swipeConfidenceThreshold) {
      // Swipe Right -> Go to Lobby (if in Stats)
      if (viewIndex === 1) paginate(-1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
      filter: 'blur(4px)'
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)'
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
      filter: 'blur(4px)'
    })
  };

  return (
    // 'overscroll-none' prevents the browser from handling scroll chaining (prevents swipe-to-back history nav)
    <div className="relative h-screen w-full overflow-hidden bg-slate-50 overscroll-none">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={viewIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2} // Provides resistance feeling
          onDragEnd={handleDragEnd}
          // 'touch-pan-y' is CRITICAL: it tells the browser "handle vertical scrolls, but ignore horizontal ones"
          // allowing JS/Framer to capture horizontal swipes without fighting the browser.
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-pan-y"
        >
          {viewIndex === 0 ? (
            <div className="w-full h-full flex items-center justify-center">
                <Lobby setRoomId={setRoomId} gameState={gameState} onOpenProfile={onOpenProfile} />
            </div>
          ) : (
            <div className="w-full h-full">
                <StatsDashboard onOpenProfile={onOpenProfile} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Floating Bottom Navigation (M3 Style) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xl p-1.5 rounded-full shadow-xl border border-white/50 ring-1 ring-slate-900/5">
            
            {/* Play Button */}
            <button 
                onClick={() => navigateTo(0)}
                className={`
                    relative flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300
                    ${viewIndex === 0 ? 'text-[#F2FCFF]' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}
                `}
            >
                {viewIndex === 0 && (
                    <motion.div 
                        layoutId="nav-pill" 
                        className="absolute inset-0 bg-[#01323F] rounded-full shadow-md"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <span className="relative z-10 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                    Play
                </span>
            </button>

            {/* Stats Button */}
            <button 
                onClick={() => navigateTo(1)}
                className={`
                    relative flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300
                    ${viewIndex === 1 ? 'text-[#F2FCFF]' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}
                `}
            >
                {viewIndex === 1 && (
                    <motion.div 
                        layoutId="nav-pill" 
                        className="absolute inset-0 bg-[#01323F] rounded-full shadow-md"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <span className="relative z-10 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
                    </svg>
                    Stats
                </span>
            </button>
        </div>
      </div>
      
      {/* Helper Hint - Updated text */}
      <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-slate-300 uppercase tracking-widest pointer-events-none">
          Swipe or Tap to navigate
      </div>
    </div>
  );
};

export default Home;
