
import React, { useState, useEffect } from 'react';
import SegmentedControl from './SegmentedControl';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { MatchData, UserProfile } from '../types';

// --- Types for Analytics ---

interface SoloStatsData {
  highScore: number;
  totalGames: number;
  avgEfficiency: string;
  avgErrors: string;
  totalPlayTime: string;
  winRate: string;
  avgLevel: string;
  bestLives: number;
}

interface PartnerStats {
  uid: string;
  name: string;
  games: number;
  wins: number;
  highestLevel: number;
}

interface TeamStatsData {
  topPartner: { name: string; games: number } | null;
  bestTeamWinRate: { names: string[]; rate: number; games: number } | null;
  bestTeamSync: { names: string[]; avgErrors: number; games: number } | null;
  sizeStats: { size: number; avgLevel: string; count: number }[];
  partnerTable: PartnerStats[];
}

const StatsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('solo');
  
  // State for real data
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false); // Cache flag
  
  // Store RAW matches for Client-Side Filtering
  const [allMatches, setAllMatches] = useState<MatchData[]>([]);
  
  const [soloData, setSoloData] = useState<SoloStatsData>({ 
    highScore: 0, totalGames: 0, avgEfficiency: '0', avgErrors: '0',
    totalPlayTime: '0m', winRate: '0%', avgLevel: '0', bestLives: 0
  });

  const [teamData, setTeamData] = useState<TeamStatsData>({
    topPartner: null,
    bestTeamWinRate: null,
    bestTeamSync: null,
    sizeStats: [],
    partnerTable: []
  });
  
  const [hasPlayed, setHasPlayed] = useState(false);

  // Helper: Format Duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Helper: Unique Team Key (Sorted IDs)
  const getTeamKey = (playerIds: string[]) => {
    return [...playerIds].sort().join(',');
  };

  useEffect(() => {
    if (!user || dataFetched) return;

    const fetchAndCalculate = async () => {
      setLoading(true);
      try {
        // 1. Fetch User Profile
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

        // 2. Fetch ALL Matches
        const matchesRef = collection(db, 'matches');
        const q = query(
            matchesRef,
            where('playerIds', 'array-contains', user.uid),
            orderBy('endTime', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const matches = querySnapshot.docs.map(d => d.data() as MatchData);
        
        setAllMatches(matches);
        setDataFetched(true);

        // --- SOLO CALCULATION ---
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
                
                if (m.levelReached >= 12) {
                    wins++;
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

        // --- TEAM CALCULATION ---
        
        // Maps for aggregation
        const partnerMap: Record<string, PartnerStats> = {};
        const teamMap: Record<string, { 
            ids: string[], 
            names: string[], 
            games: number, 
            wins: number, 
            errors: number 
        }> = {};
        const sizeMap: Record<number, { games: number, levelSum: number }> = {};

        matches.forEach(m => {
            // A. Partner Stats
            m.playerIds.forEach((pid, idx) => {
                if (pid === user.uid) return; // Skip self

                const pName = m.playerNames[idx] || 'Unknown';
                if (!partnerMap[pid]) {
                    partnerMap[pid] = { uid: pid, name: pName, games: 0, wins: 0, highestLevel: 0 };
                }
                partnerMap[pid].games += 1;
                if (m.levelReached >= 12) partnerMap[pid].wins += 1;
                if (m.levelReached > partnerMap[pid].highestLevel) partnerMap[pid].highestLevel = m.levelReached;
            });

            // B. Team Stats (Only if multiplayer)
            if (m.playerIds.length > 1) {
                const tKey = getTeamKey(m.playerIds);
                if (!teamMap[tKey]) {
                    // Extract other names for display
                    const otherNames = m.playerNames.filter((_, i) => m.playerIds[i] !== user.uid);
                    teamMap[tKey] = { 
                        ids: m.playerIds, 
                        names: otherNames, 
                        games: 0, 
                        wins: 0, 
                        errors: 0 
                    };
                }
                teamMap[tKey].games += 1;
                if (m.levelReached >= 12) teamMap[tKey].wins += 1;
                teamMap[tKey].errors += (m.errorsMade || 0);

                // C. Size Stats
                const size = m.playerIds.length;
                if (!sizeMap[size]) sizeMap[size] = { games: 0, levelSum: 0 };
                sizeMap[size].games += 1;
                sizeMap[size].levelSum += m.levelReached;
            }
        });

        // 1. Top Partner
        const partners = Object.values(partnerMap);
        const topPartner = partners.length > 0 
            ? partners.reduce((prev, current) => (prev.games > current.games) ? prev : current) 
            : null;

        // 2 & 3. Best Teams (Min 3 games)
        const eligibleTeams = Object.values(teamMap).filter(t => t.games >= 3);
        
        const bestWinRateTeam = eligibleTeams.length > 0 
            ? eligibleTeams.sort((a, b) => (b.wins/b.games) - (a.wins/a.games))[0]
            : null;
            
        const bestSyncTeam = eligibleTeams.length > 0
            ? eligibleTeams.sort((a, b) => (a.errors/a.games) - (b.errors/b.games))[0] // Lowest errors first
            : null;

        // 4. Size Stats
        const sizeStats = Object.keys(sizeMap).map(k => {
            const key = parseInt(k);
            return {
                size: key,
                count: sizeMap[key].games,
                avgLevel: (sizeMap[key].levelSum / sizeMap[key].games).toFixed(1)
            };
        }).sort((a, b) => a.size - b.size);

        setTeamData({
            topPartner: topPartner ? { name: topPartner.name, games: topPartner.games } : null,
            bestTeamWinRate: bestWinRateTeam ? { 
                names: bestWinRateTeam.names, 
                rate: Math.round((bestWinRateTeam.wins / bestWinRateTeam.games) * 100),
                games: bestWinRateTeam.games
            } : null,
            bestTeamSync: bestSyncTeam ? {
                names: bestSyncTeam.names,
                avgErrors: parseFloat((bestSyncTeam.errors / bestSyncTeam.games).toFixed(1)),
                games: bestSyncTeam.games
            } : null,
            sizeStats: sizeStats,
            partnerTable: partners.sort((a, b) => b.games - a.games) // Sort table by games played
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
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 animate-[fadeIn_0.3s_ease-out]">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#01323F] rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-sm">Crunching numbers...</p>
                </div>
            ) : !hasPlayed ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center p-8 bg-white rounded-3xl border border-slate-100 animate-[fadeIn_0.3s_ease-out]">
                    <span className="text-4xl">🌱</span>
                    <h3 className="text-lg font-bold text-slate-700">No games played yet</h3>
                    <p className="text-slate-500 text-sm">Play your first game to unlock detailed statistics.</p>
                </div>
            ) : (
                <>
                {activeTab === 'solo' && (
                    <div className="grid grid-cols-2 gap-4 pb-8 animate-[fadeIn_0.3s_ease-out]">
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

                {activeTab === 'team' && (
                    <div className="space-y-6 pb-8 animate-[fadeIn_0.3s_ease-out]">
                        
                        {/* HERO GRID (4 Dark Cards) */}
                        <div className="grid grid-cols-2 gap-4">
                            
                            {/* 1. Top Partner */}
                            <div className="bg-[#01323F] p-4 rounded-3xl shadow-md text-[#F2FCFF] flex flex-col justify-between h-40 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="text-6xl">🤝</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Top Partner</p>
                                    <h3 className="text-lg font-bold leading-tight mt-1 truncate">
                                        {teamData.topPartner?.name || '-'}
                                    </h3>
                                </div>
                                <div>
                                    <span className="text-3xl font-light">{teamData.topPartner?.games || 0}</span>
                                    <span className="text-xs opacity-60 ml-1">games</span>
                                </div>
                            </div>

                            {/* 2. Dream Team (Win Rate) */}
                            <div className="bg-[#01323F] p-4 rounded-3xl shadow-md text-[#F2FCFF] flex flex-col justify-between h-40 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="text-6xl">🔥</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Best Win Rate</p>
                                    <div className="flex -space-x-2 mt-2 overflow-hidden py-1">
                                        {teamData.bestTeamWinRate ? (
                                            teamData.bestTeamWinRate.names.map((n, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] font-bold border border-[#01323F] relative z-10" title={n}>
                                                    {n.charAt(0)}
                                                </div>
                                            ))
                                        ) : <span className="text-xs italic opacity-50">Min 3 games</span>}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-3xl font-light">{teamData.bestTeamWinRate ? teamData.bestTeamWinRate.rate : 0}</span>
                                    <span className="text-xs opacity-60 ml-1">%</span>
                                </div>
                            </div>

                            {/* 3. Highest Sync (Errors) */}
                            <div className="bg-[#01323F] p-4 rounded-3xl shadow-md text-[#F2FCFF] flex flex-col justify-between h-40 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="text-6xl">🧠</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Highest Sync</p>
                                    <p className="text-xs opacity-50 truncate mt-1">
                                        {teamData.bestTeamSync ? teamData.bestTeamSync.names.join(', ') : 'Min 3 games'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-3xl font-light">{teamData.bestTeamSync ? teamData.bestTeamSync.avgErrors : 0}</span>
                                    <span className="text-xs opacity-60 ml-1">avg err</span>
                                </div>
                            </div>

                             {/* 4. Performance by Size (Bar Chart) */}
                             <div className="bg-[#01323F] p-4 rounded-3xl shadow-md text-[#F2FCFF] flex flex-col h-40 relative overflow-hidden">
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Avg Level / Size</p>
                                <div className="flex-1 flex items-end justify-between gap-2 px-1">
                                    {teamData.sizeStats.length > 0 ? teamData.sizeStats.map((stat) => (
                                        <div key={stat.size} className="flex flex-col items-center gap-1 w-full">
                                            <div className="w-full bg-indigo-500/50 rounded-t-sm relative group" style={{ height: `${(parseFloat(stat.avgLevel) / 12) * 80}px`, minHeight: '4px' }}>
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/50 px-1 rounded">
                                                    Lvl {stat.avgLevel}
                                                </div>
                                            </div>
                                            <span className="text-[10px] opacity-60">{stat.size}p</span>
                                        </div>
                                    )) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs opacity-30 italic">No data</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PARTNER TABLE */}
                        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-700">All Partners</h3>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Name</th>
                                            <th className="px-6 py-3 font-medium text-center">Games</th>
                                            <th className="px-6 py-3 font-medium text-center">Win %</th>
                                            <th className="px-6 py-3 font-medium text-right">Best Lvl</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {teamData.partnerTable.map((partner) => (
                                            <tr key={partner.uid} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-700 truncate max-w-[100px]">
                                                    {partner.name}
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-500">
                                                    {partner.games}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold 
                                                        ${(partner.wins / partner.games) > 0.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {Math.round((partner.wins / partner.games) * 100)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-600">
                                                    {partner.highestLevel}
                                                </td>
                                            </tr>
                                        ))}
                                        {teamData.partnerTable.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                                                    No partners found. Go play some multiplayer games!
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
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
                </>
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
