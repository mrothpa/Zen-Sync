import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Reaction } from '../types';

interface ReactionOverlayProps {
  roomId: string;
}

// Cast motion.div for TS compatibility if needed in this env
const MotionDiv = motion.div as any;

const ReactionOverlay: React.FC<ReactionOverlayProps> = ({ roomId }) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    // Listen to the 'reactions' subcollection
    const q = query(
        collection(db, 'rooms', roomId, 'reactions'),
        orderBy('timestamp', 'desc'),
        limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newReaction = { id: change.doc.id, ...change.doc.data() } as Reaction;
          
          // Only show reactions that happened in the last 5 seconds (prevent loading old history)
          if (Date.now() - newReaction.timestamp < 5000) {
              setReactions((prev) => [...prev, newReaction]);

              // Auto-remove from local state after animation
              setTimeout(() => {
                setReactions((prev) => prev.filter(r => r.id !== newReaction.id));
              }, 2500);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [roomId]);

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden flex items-end justify-start pl-4 pb-24 md:pl-12 md:pb-32">
        <div className="flex flex-col-reverse items-start gap-2 w-full max-w-[200px]">
            <AnimatePresence>
                {reactions.map((reaction) => (
                    <MotionDiv
                        key={reaction.id}
                        initial={{ opacity: 0, y: 50, scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.8 }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                        className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-white/40"
                    >
                        <span className="text-2xl">{reaction.emoji}</span>
                        {/* Optional: Show sender name briefly */}
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[80px]">
                            {reaction.senderName}
                        </span>
                    </MotionDiv>
                ))}
            </AnimatePresence>
        </div>
    </div>
  );
};

export default ReactionOverlay;
