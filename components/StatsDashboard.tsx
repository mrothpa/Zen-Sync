
import React, { useState, useEffect } from 'react';
import SegmentedControl from './SegmentedControl';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { MatchData, UserProfile } from '../types';

interface SoloStatsData {
  highScore: number;       // Card 1
  totalGames: number;      // Card 2
  avgEfficiency: string;   // Card 3
  avgErrors: string;       // Card 4
  totalPlayTime: string;   // Card 5
  winRate: string;         // Card 6
  avgLevel: string;        // Card 7
  bestLives: number;       // Card 8
}

const StatsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('solo');
  
  // State for real data
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false); // Cache flag
  
  // Store RAW matches for Client-Side Filtering (Team/Global reuse)
  const [allMatches, setAllMatches] = useState<MatchData[]>([]);
  
  const [soloData, setSoloData] = useState<SoloStatsData>({ 
    highScore: 0,
    totalGames: 0,
    avgEfficiency: '0',
    avgErrors: '0',
    totalPlayTime: '0m',
    winRate: '0%', 
    avgLevel: '0', 
    bestLives: 0
  });
  
  const [hasPlayed, setHasPlayed] = useState(false);

  // Helper: Format Duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  useEffect(() => {
    if (!user || dataFetched) return;

    const fetchAndCalculate = async () => {
      setLoading(true);
      try {
        // 1. Fetch User Profile (Card 1 & 2 Base)
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? (userSnap.data() as UserProfile) : null;
        
        if (!userData || !userData.totalGamesPlayed || userData.totalGamesPlayed === 0) {
            setHasPlayed(false);
            setLoading(false);
            setDataFetched(true);
            return;
        }
        setHasPlayed(true);

        // 2. Fetch ALL Matches for this user
        const matchesRef = collection(db, 'matches');
        const q = query(
            matchesRef,
            where('playerIds', 'array-contains', user.uid),
            orderBy('endTime', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const matches = querySnapshot.docs.map(d => d.data() as MatchData);
        
        // Cache raw data
        setAllMatches(matches);
        setDataFetched(true);

        // 3. Calculate Solo Stats (Client-Side Aggregation)
        let totalSeconds = 0;
        let totalLevels = 0;
        let wins = 0;
        let maxLivesInWin = 0;
        let sumErrors = 0;
        let sumEfficiency = 0;
        
        const matchCount = matches.length;

        if (matchCount > 0) {
            matches.forEach(m => {
                totalSeconds += m.durationSeconds || 0;
                totalLevels += m.levelReached || 0;
                sumErrors += m.errorsMade || 0;
                sumEfficiency += m.starsEfficiency || 0;
                
                // Win Condition: Level 12 reached
                if (m.levelReached >= 12) {
                    wins++;
                    // Only track max lives for WON games (as per logic "best performance")
                    if (m.livesLeft > maxLivesInWin) maxLivesInWin = m.livesLeft;
                }
            });
        }

        setSoloData({
            highScore: userData.highestLevelReached || 0,
            totalGames: userData.totalGamesPlayed || 0,
            avgEfficiency: matchCount > 0 ? (sumEfficiency / matchCount).toFixed(1) : '0',
            avgErrors: matchCount > 0 ? (sumErrors / matchCount).toFixed(1) : '0',
            totalPlayTime: formatDuration(totalSeconds),
            winRate: matchCount > 0 ? `${Math.round((wins / matchCount) * 100)}%` : '0%',
            avgLevel: matchCount > 0 ? (totalLevels / matchCount).toFixed(1) : '0',
            bestLives: maxLivesInWin
        });

      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndCalculate();
  }, [user, dataFetched]);

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
                <div className="animate-[fadeIn_0.3s_ease-out]">
                    {loading ? (
                         <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#01323F] rounded-full animate-spin"></div>
                            <p className="text-slate-400 text-sm">Analyzing brainwaves...</p>
                         </div>
                    ) : !hasPlayed ? (
                         <div className="flex flex-col items-center justify-center h-64 gap-4 text-center p-8 bg-white rounded-3xl border border-slate-100">
                            <span className="text-4xl">🌱</span>
                            <h3 className="text-lg font-bold text-slate-700">No games played yet</h3>
                            <p className="text-slate-500 text-sm">Play your first game to unlock detailed statistics.</p>
                         </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 pb-8">
                            {/* Card 1: Personal Record */}
                            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                <span className="text-2xl">🏆</span>
                                <span className="text-2xl font-bold text-[#01323F]">{soloData.highScore}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Highest Level</span>
                            </div>

                            {/* Card 2: Experience */}
                            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                <span className="text-2xl">🎮</span>
                                <span className="text-2xl font-bold text-[#01323F]">{soloData.totalGames}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Total Games</span>
                            </div>

                            {/* Card 3: Star Efficiency */}
                            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                <span className="text-2xl">⭐</span>
                                <span className="text-2xl font-bold text-[#01323F]">{soloData.avgEfficiency}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Cards/Star Avg</span>
                            </div>

                            {/* Card 4: Precision */}
                            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                <span className="text-2xl">🎯</span>
                                <span className="text-2xl font-bold text-[#01323F]">{soloData.avgErrors}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Avg Errors</span>
                            </div>

                             {/* Card 5: Total Play Time */}
                             <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                <span className="text-2xl">⏳</span>
                                <span className="text-xl font-bold text-[#01323F] break-all text-center leading-tight">{soloData.totalPlayTime}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Play Time</span>
                            </div>

                             {/* Card 6: Win Rate */}
                             <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                <span className="text-2xl">👑</span>
                                <span className="text-2xl font-bold text-[#01323F]">{soloData.winRate}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Win Rate</span>
                            </div>

                             {/* Card 7: Avg Level */}
                             <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                <span className="text-2xl">📊</span>
                                <span className="text-2xl font-bold text-[#01323F]">{soloData.avgLevel}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Avg Level</span>
                            </div>

                             {/* Card 8: Best Lives (Won Game) */}
                             <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                <span className="text-2xl">❤️</span>
                                <span className="text-2xl font-bold text-[#01323F]">{soloData.bestLives}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Max Lives (Won)</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'team' && (
                <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Top Synergy Partners</h3>
                    <div className="bg-slate-50 p-6 rounded-2xl text-center text-slate-400 text-sm italic border border-slate-100">
                        Select 'Team' to calculate partner synergy from {allMatches.length} matches.
                        <br/><span className="text-xs mt-2 block">(Coming in next update)</span>
                    </div>
                </div>
            )}

            {activeTab === 'global' && (
                <div className="space-y-2 animate-[fadeIn_0.3s_ease-out]">
                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Global Rankings</h3>
                     <div className="bg-slate-50 p-6 rounded-2xl text-center text-slate-400 text-sm italic border border-slate-100">
                        Global leaderboard integration pending.
                     </div>
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
