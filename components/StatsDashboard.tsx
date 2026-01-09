import React, { useState } from 'react';
import SegmentedControl from './SegmentedControl';
import { useAuth } from '../contexts/AuthContext';

const StatsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('solo');

  // MOCK DATA
  const soloStats = [
    { label: 'Highest Level', value: '12', icon: '🏆' },
    { label: 'Games Played', value: '47', icon: '🎮' },
    { label: 'Ninja Stars Used', value: '89', icon: '⭐' },
    { label: 'Sync Rate', value: '92%', icon: '🧠' },
  ];

  const teamStats = [
    { name: 'Sarah', games: 12, winRate: '80%', avatar: 'S' },
    { name: 'Mike', games: 8, winRate: '65%', avatar: 'M' },
    { name: 'Jessica', games: 5, winRate: '100%', avatar: 'J' },
  ];

  const globalRank = [
    { rank: 1, name: 'MindMaster', score: 9850 },
    { rank: 2, name: 'ZenGuru', score: 9200 },
    { rank: 3, name: 'SyncKing', score: 8950 },
    { rank: 42, name: 'You', score: 4200, highlight: true },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center pt-24 pb-8 px-6 overflow-y-auto">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800">Your Stats</h2>
            <p className="text-slate-500">Track your synchronization journey.</p>
        </div>

        {/* M3 Segmented Control */}
        <SegmentedControl
            selectedValue={activeTab}
            onChange={setActiveTab}
            options={[
                { value: 'solo', label: 'Solo', icon: <span className="text-xs">👤</span> },
                { value: 'team', label: 'Team', icon: <span className="text-xs">👥</span> },
                { value: 'global', label: 'Global', icon: <span className="text-xs">🌍</span> },
            ]}
        />

        {/* Content Area */}
        <div className="min-h-[300px]">
            {activeTab === 'solo' && (
                <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease-out]">
                    {soloStats.map((stat) => (
                        <div key={stat.label} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 aspect-square">
                            <span className="text-3xl">{stat.icon}</span>
                            <span className="text-3xl font-bold text-[#01323F]">{stat.value}</span>
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider text-center">{stat.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'team' && (
                <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Top Synergy Partners</h3>
                    {teamStats.map((mate) => (
                        <div key={mate.name} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                    {mate.avatar}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">{mate.name}</p>
                                    <p className="text-xs text-slate-400">{mate.games} Games</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-emerald-600">{mate.winRate}</span>
                                <span className="text-xs text-slate-400">Win Rate</span>
                            </div>
                        </div>
                    ))}
                    <button className="w-full py-3 text-indigo-600 text-sm font-medium hover:bg-indigo-50 rounded-xl transition-colors">
                        View All Partners
                    </button>
                </div>
            )}

            {activeTab === 'global' && (
                <div className="space-y-2 animate-[fadeIn_0.3s_ease-out]">
                     {globalRank.map((entry) => (
                        <div 
                            key={entry.rank} 
                            className={`flex items-center justify-between p-4 rounded-2xl border 
                                ${entry.highlight 
                                    ? 'bg-[#01323F] text-[#F2FCFF] border-[#01323F] shadow-lg scale-105' 
                                    : 'bg-white text-slate-700 border-slate-100'}`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`font-mono text-lg font-bold ${entry.highlight ? 'text-white/50' : 'text-slate-300'}`}>#{entry.rank}</span>
                                <span className="font-medium">{entry.name}</span>
                            </div>
                            <span className="font-bold">{entry.score} pts</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default StatsDashboard;