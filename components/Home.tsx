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
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95
    })
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50">
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
          dragElastic={0.2} // Elastic feel
          onDragEnd={handleDragEnd}
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

      {/* Navigation Indicators (M3 Page Indicator) */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-50 pointer-events-none">
        <div 
            className={`h-2 rounded-full transition-all duration-300 shadow-sm
            ${viewIndex === 0 ? 'w-8 bg-[#01323F]' : 'w-2 bg-slate-300'}`} 
        />
        <div 
            className={`h-2 rounded-full transition-all duration-300 shadow-sm
            ${viewIndex === 1 ? 'w-8 bg-[#01323F]' : 'w-2 bg-slate-300'}`} 
        />
      </div>
      
      {/* Helper Hint (Fade out after interaction?) - Optional */}
      <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-slate-300 uppercase tracking-widest pointer-events-none">
          Swipe to navigate
      </div>
    </div>
  );
};

export default Home;