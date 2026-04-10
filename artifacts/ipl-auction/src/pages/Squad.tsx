import React from "react";
import { useLocation } from "wouter";
import { useGetAuctionState, getGetAuctionStateQueryKey, type Team, type Player } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Wallet, Trophy, Star, TrendingUp, LayoutGrid } from "lucide-react";
import { Loader2 } from "lucide-react";

const ROLE_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  Batsman:       { text: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   glow: "#3b82f6" },
  Bowler:        { text: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  glow: "#22c55e" },
  "All-rounder": { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", glow: "#a855f7" },
  Wicketkeeper:  { text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  glow: "#f59e0b" },
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[9px] mb-0.5">
        <span className="text-white/30 uppercase tracking-wider">{label}</span>
        <span className="font-mono text-white/60">{value}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function Squad() {
  const [, setLocation] = useLocation();

  const { data: state, isLoading } = useGetAuctionState({
    query: { queryKey: getGetAuctionStateQueryKey(), refetchInterval: 3000 },
  });

  const userTeam = state?.teams?.find((t: Team) => t.id === state.userTeamId);
  const players: Player[] = (userTeam?.players ?? []) as Player[];

  const byRole: Record<string, Player[]> = {
    Batsman: [], Bowler: [], "All-rounder": [], Wicketkeeper: [],
  };
  players.forEach((p: Player) => { if (byRole[p.role]) byRole[p.role].push(p); });

  const totalSpent = (userTeam?.initialBudget ?? 0) - (userTeam?.budget ?? 0);
  const avgRating = players.length > 0
    ? Math.round(players.reduce((s: number, p: Player) => s + p.skillRating, 0) / players.length)
    : 0;
  const topPlayer = players.sort((a, b) => b.skillRating - a.skillRating)[0];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-3 bg-black/80 sticky top-0 z-10">
        <Button variant="ghost" size="sm" className="text-white/40 hover:text-white" onClick={() => setLocation("/auction")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Auction
        </Button>
        {userTeam && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center"
              style={{ backgroundColor: userTeam.color }}
            >
              {userTeam.shortName.slice(0, 2)}
            </div>
            <span className="text-sm font-black" style={{ color: userTeam.color }}>
              {userTeam.name}
            </span>
          </div>
        )}
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-xs" onClick={() => setLocation("/teams")}>
            <LayoutGrid className="h-3 w-3 mr-1" /> All Teams
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats cards */}
        {userTeam && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Players", value: `${players.length}/25`, icon: Users, color: "#3b82f6" },
              { label: "Budget Left", value: `₹${userTeam.budget.toFixed(2)} Cr`, icon: Wallet, color: "#22c55e" },
              { label: "Total Spent", value: `₹${totalSpent.toFixed(2)} Cr`, icon: Trophy, color: "#f59e0b" },
              { label: "Avg Rating", value: `${avgRating || "—"}/100`, icon: Star, color: "#a855f7" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="rounded-xl border border-white/5 p-4"
                style={{ background: `linear-gradient(135deg, ${color}08, rgba(0,0,0,0.5))` }}
              >
                <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  <Icon className="h-3 w-3" style={{ color }} />
                  {label}
                </div>
                <div className="text-2xl font-black font-mono text-white">{value}</div>
              </div>
            ))}
          </div>
        )}

        {players.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <Users className="h-14 w-14 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold">No players bought yet</p>
            <Button className="mt-4 bg-yellow-400 text-black font-bold" onClick={() => setLocation("/auction")}>
              Go to Auction
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byRole).map(([role, rolePlayers]) => {
              if (rolePlayers.length === 0) return null;
              const rc = ROLE_COLORS[role] || ROLE_COLORS.Batsman;
              return (
                <div key={role}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs border px-3 py-1 rounded-full font-bold ${rc.bg} ${rc.text} ${rc.border}`}>
                      {role}
                    </span>
                    <span className="text-xs text-white/20">{rolePlayers.length} player{rolePlayers.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {rolePlayers.map((player: Player) => (
                      <div
                        key={player.id}
                        className="border rounded-xl p-4 transition-all hover:border-white/10"
                        style={{
                          borderColor: rc.glow + "25",
                          background: `linear-gradient(135deg, ${rc.glow}08, rgba(0,0,0,0.6))`,
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-bold text-sm text-white leading-tight">{player.name}</div>
                            <div className="text-[10px] text-white/30 mt-0.5">{player.nationality}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-black text-sm" style={{ color: rc.glow }}>
                              ₹{player.soldPrice?.toFixed(2)} Cr
                            </div>
                            <div
                              className="text-[10px] flex items-center gap-0.5 justify-end"
                              style={{ color: rc.glow + "80" }}
                            >
                              <TrendingUp className="h-2.5 w-2.5" /> Form {player.form}
                            </div>
                          </div>
                        </div>

                        {/* Overall rating badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                            style={{ background: rc.glow + "30", border: `1px solid ${rc.glow}40` }}
                          >
                            {player.skillRating}
                          </div>
                          <div className="flex-1 space-y-1">
                            <StatBar label="BAT" value={player.battingRating} color="#3b82f6" />
                            <StatBar label="BWL" value={player.bowlingRating} color="#22c55e" />
                          </div>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="p-1.5 rounded-lg bg-white/3 border border-white/5">
                            <div className="text-[10px] font-mono font-bold text-white/70">{player.strikeRate}</div>
                            <div className="text-[8px] text-white/20">SR</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white/3 border border-white/5">
                            <div className="text-[10px] font-mono font-bold text-white/70">{player.economy?.toFixed(1)}</div>
                            <div className="text-[8px] text-white/20">ECO</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white/3 border border-white/5">
                            <div className="text-[10px] font-mono font-bold text-white/70">{player.age}y</div>
                            <div className="text-[8px] text-white/20">AGE</div>
                          </div>
                        </div>

                        {/* Strengths */}
                        {player.strengths && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {player.strengths.split(",").slice(0, 2).map(s => (
                              <span key={s} className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400/70 border border-green-500/15">
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
