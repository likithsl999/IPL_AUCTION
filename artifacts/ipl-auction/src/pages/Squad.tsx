import React from "react";
import { useLocation } from "wouter";
import { useGetAuctionState, getGetAuctionStateQueryKey, type Team, type Player } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Wallet, Trophy } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  Batsman: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Bowler: "bg-green-500/20 text-green-400 border-green-500/30",
  "All-rounder": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Wicketkeeper: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function Squad() {
  const [, setLocation] = useLocation();

  const { data: state, isLoading } = useGetAuctionState({
    query: { queryKey: getGetAuctionStateQueryKey() },
  });

  const userTeam = state?.teams?.find((t: Team) => t.id === state.userTeamId);
  const players: Player[] = userTeam?.players ?? [];

  // Group by role
  const byRole: Record<string, typeof players> = {
    Batsman: [],
    Bowler: [],
    "All-rounder": [],
    Wicketkeeper: [],
  };
  players.forEach((p: Player) => {
    if (byRole[p.role]) byRole[p.role].push(p);
  });

  const totalSpent = (userTeam?.initialBudget ?? 0) - (userTeam?.budget ?? 0);
  const avgRating = players.length > 0
    ? Math.round(players.reduce((s: number, p: Player) => s + p.skillRating, 0) / players.length)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3 bg-card/50 sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/auction")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Auction
        </Button>
        {userTeam && (
          <div
            className="ml-2 flex items-center gap-2 font-bold text-sm"
            style={{ color: userTeam.color }}
          >
            <div
              className="w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center"
              style={{ backgroundColor: userTeam.color }}
            >
              {userTeam.shortName}
            </div>
            {userTeam.name}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        {userTeam && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Players", value: `${players.length}/25`, icon: Users },
              { label: "Budget Left", value: `₹${userTeam.budget.toFixed(2)} Cr`, icon: Wallet },
              { label: "Total Spent", value: `₹${totalSpent.toFixed(2)} Cr`, icon: Trophy },
              { label: "Avg Rating", value: `${avgRating}/100`, icon: Trophy },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
                <div className="text-2xl font-black font-mono">{value}</div>
              </div>
            ))}
          </div>
        )}

        {players.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No players bought yet.</p>
            <Button className="mt-4" onClick={() => setLocation("/auction")}>Go to Auction</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byRole).map(([role, rolePlayers]) => {
              if (rolePlayers.length === 0) return null;
              return (
                <div key={role}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs border px-3 py-1 rounded-full font-medium ${ROLE_COLORS[role] || ""}`}>
                      {role}
                    </span>
                    <span className="text-xs text-muted-foreground">{rolePlayers.length} player{rolePlayers.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {rolePlayers.map((player: Player) => (
                      <div
                        key={player.id}
                        className="bg-card border border-border rounded-lg p-4 hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-bold text-sm">{player.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{player.nationality}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-black text-sm">₹{player.soldPrice?.toFixed(2)} Cr</div>
                            <div className="text-[10px] text-muted-foreground">Paid</div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Skill</span>
                            <span className="font-mono text-foreground">{player.skillRating}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${player.skillRating}%`,
                                background: "linear-gradient(90deg, #3b82f6, #8b5cf6)"
                              }}
                            />
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
      </div>
    </div>
  );
}
