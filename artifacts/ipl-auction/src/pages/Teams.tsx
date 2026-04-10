import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetAuctionState, getGetAuctionStateQueryKey, type Team, type Player } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Wallet, Star, TrendingUp, Loader2 } from "lucide-react";

const ROLE_COLORS: Record<string, { text: string; bg: string }> = {
  Batsman:       { text: "text-blue-400",   bg: "bg-blue-500/10"   },
  Bowler:        { text: "text-green-400",  bg: "bg-green-500/10"  },
  "All-rounder": { text: "text-purple-400", bg: "bg-purple-500/10" },
  Wicketkeeper:  { text: "text-amber-400",  bg: "bg-amber-500/10"  },
};

function RoleBreakdown({ players }: { players: Player[] }) {
  const counts: Record<string, number> = { Batsman: 0, Bowler: 0, "All-rounder": 0, Wicketkeeper: 0 };
  players.forEach(p => { if (counts[p.role] !== undefined) counts[p.role]++; });
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(counts).map(([role, count]) => {
        if (count === 0) return null;
        const rc = ROLE_COLORS[role] || { text: "text-white/40", bg: "bg-white/5" };
        return (
          <span key={role} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rc.bg} ${rc.text}`}>
            {count} {role}
          </span>
        );
      })}
    </div>
  );
}

function TeamCard({ team, isUserTeam, isExpanded, onToggle }: {
  team: Team;
  isUserTeam: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const totalSpent = team.initialBudget - team.budget;
  const budgetPct = (team.budget / team.initialBudget) * 100;
  const avgRating = team.players.length > 0
    ? Math.round(team.players.reduce((s: number, p: Player) => s + p.skillRating, 0) / team.players.length)
    : 0;

  // Group by role
  const byRole: Record<string, Player[]> = { Batsman: [], Bowler: [], "All-rounder": [], Wicketkeeper: [] };
  team.players.forEach((p: Player) => { if (byRole[p.role]) byRole[p.role].push(p); });

  return (
    <div
      className="border rounded-xl overflow-hidden transition-all duration-200"
      style={{
        borderColor: isUserTeam ? team.color + "50" : "rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        boxShadow: isUserTeam ? `0 0 20px ${team.color}15` : "none",
      }}
    >
      {/* Team header */}
      <button
        className="w-full text-left p-4 hover:bg-white/2 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {/* Team badge */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xs flex-shrink-0"
            style={{ backgroundColor: team.color, boxShadow: `0 0 12px ${team.color}40` }}
          >
            {team.shortName.slice(0, 3)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white truncate">{team.name}</span>
              {isUserTeam && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-bold border border-yellow-400/20">
                  YOU
                </span>
              )}
            </div>
            <RoleBreakdown players={team.players as Player[]} />
          </div>

          <div className="text-right flex-shrink-0 space-y-1">
            <div className="text-xs font-mono font-bold text-white">
              ₹{team.budget.toFixed(1)} Cr
            </div>
            <div className="text-[10px] text-white/30 flex items-center justify-end gap-1">
              <Users className="h-2.5 w-2.5" /> {team.players.length}/25
            </div>
          </div>
        </div>

        {/* Budget bar */}
        <div className="mt-3 space-y-1">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${budgetPct}%`, backgroundColor: team.color }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-white/20 font-mono">
            <span>Spent ₹{totalSpent.toFixed(1)} Cr</span>
            <span>{budgetPct.toFixed(0)}% remaining</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Players", value: team.players.length.toString(), icon: Users },
            { label: "Avg OVR", value: avgRating > 0 ? avgRating.toString() : "—", icon: Star },
            { label: "Spent", value: `₹${totalSpent.toFixed(1)}`, icon: Wallet },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center p-2 rounded-lg bg-white/3 border border-white/5">
              <div className="text-xs font-mono font-bold text-white">{value}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </button>

      {/* Expanded squad */}
      {isExpanded && team.players.length > 0 && (
        <div className="border-t border-white/5 p-4">
          {Object.entries(byRole).map(([role, players]) => {
            if (players.length === 0) return null;
            const rc = ROLE_COLORS[role] || { text: "text-white/40", bg: "bg-white/5" };
            return (
              <div key={role} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${rc.text}`}>{role}</span>
                  <span className="text-[10px] text-white/20">({players.length})</span>
                </div>
                <div className="space-y-1.5">
                  {players.map((p: Player) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/2 border border-white/3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white"
                          style={{ backgroundColor: rc.text.replace("text-", "").replace("-400", "") === "white" ? "#666" : team.color + "40" }}
                        >
                          {p.skillRating}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white/80">{p.name}</div>
                          <div className="text-[9px] text-white/30">{p.nationality}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold" style={{ color: team.color }}>
                          ₹{p.soldPrice?.toFixed(2)} Cr
                        </div>
                        <div className="text-[9px] text-white/20 flex items-center gap-1 justify-end">
                          <TrendingUp className="h-2 w-2" />{p.form}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isExpanded && team.players.length === 0 && (
        <div className="border-t border-white/5 p-6 text-center text-white/20 text-sm">
          No players acquired yet
        </div>
      )}
    </div>
  );
}

export default function Teams() {
  const [, setLocation] = useLocation();
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "players" | "budget" | "rating">("players");

  const { data: state, isLoading } = useGetAuctionState({
    query: { queryKey: getGetAuctionStateQueryKey(), refetchInterval: 3000 },
  });

  const teams = state?.teams ?? [];
  const userTeamId = state?.userTeamId;

  const sortedTeams = [...teams].sort((a: Team, b: Team) => {
    switch (sortBy) {
      case "players": return b.players.length - a.players.length;
      case "budget": return b.budget - a.budget;
      case "rating": {
        const avgA = a.players.length > 0 ? a.players.reduce((s: number, p: Player) => s + p.skillRating, 0) / a.players.length : 0;
        const avgB = b.players.length > 0 ? b.players.reduce((s: number, p: Player) => s + p.skillRating, 0) / b.players.length : 0;
        return avgB - avgA;
      }
      default: return a.name.localeCompare(b.name);
    }
  });

  const handleToggle = (teamId: string) => {
    setExpandedTeamId(prev => prev === teamId ? null : teamId);
  };

  const backPath = state?.started ? "/auction" : "/";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-3 bg-black/80 sticky top-0 z-10">
        <Button variant="ghost" size="sm" className="text-white/40 hover:text-white" onClick={() => setLocation(backPath)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {state?.started ? "Back to Auction" : "Back to Setup"}
        </Button>
        <span className="text-xs font-black text-white/30 uppercase tracking-widest">All Teams</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Sort Controls */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-white/30 uppercase tracking-widest mr-2">Sort by:</span>
          {(["players", "budget", "rating", "name"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-bold ${
                sortBy === s
                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                  : "border-white/5 text-white/30 hover:border-white/10 hover:text-white/60"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTeams.map((team: Team) => (
              <TeamCard
                key={team.id}
                team={team}
                isUserTeam={team.id === userTeamId}
                isExpanded={expandedTeamId === team.id}
                onToggle={() => handleToggle(team.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

