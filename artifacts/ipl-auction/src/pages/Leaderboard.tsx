import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Trophy, Medal, Zap, Globe, Calendar, ArrowLeft, Crown } from "lucide-react";

interface LeaderboardEntry {
  user_id: number;
  username: string;
  favorite_team: string;
  titles: number;
  auction_wins: number;
  total_profit: number;
  match_wins: number;
  total_matches: number;
  win_rate: number;
}

const TEAM_COLORS: Record<string, string> = {
  CSK:"#F9CD1C", MI:"#004BA0", RCB:"#EC1C24", KKR:"#3A225D",
  DC:"#0078BC", PBKS:"#ED1B24", RR:"#254AA5", SRH:"#F7811E",
  GT:"#1C4F9C", LSG:"#A72056",
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"global" | "weekly">("global");
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/leaderboard/${tab}`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);

  const getRankIcon = (i: number) => {
    if (i === 0) return <Crown className="h-4 w-4 text-yellow-400" />;
    if (i === 1) return <Medal className="h-4 w-4 text-gray-300" />;
    if (i === 2) return <Medal className="h-4 w-4 text-orange-400" />;
    return <span className="text-white/30 text-sm font-mono w-4 text-center">{i + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Trophy className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-bold text-white">Global Leaderboard</span>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 gap-1">
          {[
            { key: "global", label: "Global", icon: Globe },
            { key: "weekly", label: "This Week", icon: Calendar },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as "global" | "weekly")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key ? "bg-yellow-400 text-black" : "text-white/40 hover:text-white"
              }`}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {data.length >= 3 && (
          <div className="grid grid-cols-3 gap-2">
            {/* 2nd */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center mt-4">
              <div className="text-2xl font-black text-gray-300 mb-1">2nd</div>
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center font-black text-lg mb-2"
                style={{ background: `${TEAM_COLORS[data[1]?.favorite_team ?? "CSK"] ?? "#F9CD1C"}22` }}>
                {data[1]?.username.slice(0,1)}
              </div>
              <div className="text-white text-xs font-bold truncate">{data[1]?.username}</div>
              <div className="text-white/30 text-[10px]">{data[1]?.titles} titles</div>
            </div>
            {/* 1st */}
            <div className="bg-gradient-to-b from-yellow-400/10 to-transparent border border-yellow-400/20 rounded-xl p-3 text-center">
              <Crown className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center font-black text-xl mb-2"
                style={{ background: `${TEAM_COLORS[data[0]?.favorite_team ?? "CSK"] ?? "#F9CD1C"}33`, border: `2px solid ${TEAM_COLORS[data[0]?.favorite_team ?? "CSK"] ?? "#F9CD1C"}44` }}>
                {data[0]?.username.slice(0,1)}
              </div>
              <div className="text-white text-xs font-bold truncate">{data[0]?.username}</div>
              <div className="text-yellow-400 text-[10px] font-bold">{data[0]?.titles} titles</div>
            </div>
            {/* 3rd */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center mt-4">
              <div className="text-2xl font-black text-orange-400 mb-1">3rd</div>
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center font-black text-lg mb-2"
                style={{ background: `${TEAM_COLORS[data[2]?.favorite_team ?? "CSK"] ?? "#F9CD1C"}22` }}>
                {data[2]?.username.slice(0,1)}
              </div>
              <div className="text-white text-xs font-bold truncate">{data[2]?.username}</div>
              <div className="text-white/30 text-[10px]">{data[2]?.titles} titles</div>
            </div>
          </div>
        )}

        {/* Full Table */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold text-white/30 uppercase tracking-wider border-b border-white/5">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-2 text-center">🏆</div>
            <div className="col-span-2 text-center">Wins</div>
            <div className="col-span-2 text-center">WR%</div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-white/30 text-sm">
              <Zap className="h-5 w-5 animate-pulse mx-auto mb-2 text-yellow-400/40" />
              Loading rankings…
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-white/20 text-sm">
              No players on the leaderboard yet.<br />
              <span className="text-xs">Be the first to play and get ranked!</span>
            </div>
          ) : (
            data.map((entry, i) => {
              const color = TEAM_COLORS[entry.favorite_team] ?? "#F9CD1C";
              return (
                <div key={entry.user_id}
                  className={`grid grid-cols-12 px-4 py-3 items-center border-b border-white/5 last:border-0 ${i < 3 ? "bg-white/[0.02]" : ""}`}>
                  <div className="col-span-1 flex items-center">{getRankIcon(i)}</div>
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: `${color}22`, color }}>
                      {entry.username.slice(0,1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-sm font-semibold truncate">{entry.username}</div>
                      <div className="text-[10px] font-bold" style={{ color }}>{entry.favorite_team}</div>
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-yellow-400 font-bold text-sm">{entry.titles}</div>
                  <div className="col-span-2 text-center text-cyan-400 text-sm">{entry.auction_wins}</div>
                  <div className="col-span-2 text-center text-green-400 text-sm">{entry.win_rate}%</div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-center text-white/15 text-[10px] pb-4">Developed by Likith</p>
      </div>
    </div>
  );
}
