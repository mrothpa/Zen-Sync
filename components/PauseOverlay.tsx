// PauseOverlay.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types';

interface PauseOverlayProps {
  players: Player[];
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({ players }) => {
  const offlinePlayers = players.filter(p => !p.isOnline);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-white max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-500 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555-.26.532-.57A48.039 48.039 0 0111 2.25a.64.64 0 01.657.643v0c0 .355.186.676.401.959.221.29.349.634.349 1.003 0 1.035-1.007 1.875-2.25 1.875s-2.25-.84-2.25-1.875c0-.369.128-.713.349-1.003.215-.283.401-.604.401-.959v0c0-.31-.26-.555-.57-.532a48.039 48.039 0 01-4.163-.3c1.613-.186 3.25-.293 4.907-.315a.656.656 0 01.663.658v0c0 .355.186.676.959.401.29.221.634.349 1.003.349 1.036 0 1.875-1.007 1.875-2.25s-.84-2.25-1.875-2.25c-.369 0-.713.128-1.003.349-.283.215-.604.401-.959.401v0c-.31 0-.555.26-.532.57a48.039 48.039 0 01-.3 4.163c-.186 1.613-.293 3.25-.315 4.907a.656.656 0 01.663.658v0c0 .355-.186.676-.401.959-.221.29-.349.634-.349 1.003 0 1.035 1.007 1.875 2.25 1.875s2.25-.84 2.25-1.875c0-.369-.128-.713-.349-1.003-.215-.283-.401-.604-.401-.959v0c0-.31.26-.555.57-.532a48.039 48.039 0 014.163.3c1.613.186 3.25.293 4.907.315a.656.656 0 01.658.663v0c0 .355-.186.676-.401.959-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.369 0 .713.128 1.003.349.283.215.604.401.959.401v0c.31 0 .555.26.532.57z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-bold text-slate-800 mb-2">Game Paused</h2>
        <p className="text-slate-500 text-sm mb-6">Connection lost. Waiting for sync...</p>

        <div className="bg-slate-50 rounded-xl p-2 space-y-2 max-h-48 overflow-y-auto">
          {players.map(p => (
            <div key={p.uid} className="flex items-center justify-between p-2 rounded-lg bg-white shadow-sm border border-slate-100">
               <span className="text-sm font-medium text-slate-700">{p.name}</span>
               {p.isOnline ? (
                 <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ONLINE
                 </div>
               ) : (
                 <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-[10px] font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 animate-spin">
                       <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                    </svg>
                    CONNECTING...
                 </div>
               )}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PauseOverlay;
