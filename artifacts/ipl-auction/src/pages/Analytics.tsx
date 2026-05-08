import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, TrendingUp, Trophy, Zap, Users, Star, Target,
  BarChart3, Award, DollarSign, Activity, Shield,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

async function fetchAuctionState() {
  const r = await fetch(`${API_BASE}/auction/state`);
  if (!r.ok) throw new Error("Failed to load auction state");
  return r.json();
}

async function fetchCareerRecords() {
  const r = await fetch(`${API_BASE}/career/records`);
  if (!r.ok) return null;
  return r.json();
}

async function fetchYouth() {
  const r = await fetch(`${API_BASE}/career/youth`);
  if (!r.ok) return null;
  return r.json();
}

async function fetchFinance() {
  const r = await fetch(`${API_BASE}/career/finance`);
  if (!r.ok) return null;
  return r.json();
}

function StatCard({ label, value, sub, color = "text-yellow-400", icon: Icon }: {
  label: string; value: string | number; sub?: string;
  color?: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-white/40 text-xs uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-white/40 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  Batsman: "text-blue-400", Bowler: "text-red-400",
  "All-rounder": "text-purple-400", Wicketkeeper: "text-green-400",
};
const ROLE_BG: Record<string, string> = {
  Batsman: "bg-blue-500", Bowler: "bg-red-500",
  "All-rounder": "bg-purple-500", Wicketkeeper: "bg-green-500",
};

export default function Analytics() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"auction" | "records" | "youth" | "finance">("auction");

  const { data: auctionData } = useQuery({ queryKey: ["auction-state"], queryFn: fetchAuctionState });
  const { data: records }     = useQuery({ queryKey: ["career-records"], queryFn: fetchCareerRecords });
  const { data: youth }       = useQuery({ queryKey: ["career-youth"],   queryFn: fetchYouth });
  const { data: finance }     = useQuery({ queryKey: ["career-finance"], queryFn: fetchFinance });

  const teams: any[] = auctionData?.teams ?? [];

  // ── Auction analytics ──────────────────────────────────────────────────────
  const allBids: Array<{ player: string; team: string; price: number; rating: number; role: string }> = [];
  let totalSpent = 0;
  const roleStats: Record<string, { count: number; spend: number }> = {};

  for (const team of teams) {
    for (const player of (team.players ?? [])) {
      const bid = player.soldPrice ?? player.basePrice ?? 2;
      allBids.push({ player: player.name, team: team.shortName, price: bid, rating: player.skillRating, role: player.role });
      totalSpent += bid;
      if (!roleStats[player.role]) roleStats[player.role] = { count: 0, spend: 0 };
      roleStats[player.role].count++;
      roleStats[player.role].spend += bid;
    }
  }

  // Best value picks: highest (skillRating / price) ratio
  const valuePicks = [...allBids]
    .filter(b => b.price > 0)
    .map(b => ({ ...b, valueRatio: +(b.rating / b.price).toFixed(2) }))
    .sort((a, b) => b.valueRatio - a.valueRatio)
    .slice(0, 8);

  // Biggest bids
  const biggestBids = [...allBids].sort((a, b) => b.price - a.price).slice(0, 10);

  // Budget efficiency (budget spent vs avg rating)
  const teamEfficiency = teams.map(t => {
    const players = t.players ?? [];
    const spent = 100 - (t.remainingBudget ?? t.budget ?? 0);
    const avgRating = players.length ? players.reduce((s: number, p: any) => s + p.skillRating, 0) / players.length : 0;
    return { name: t.shortName, color: t.color, spent: Math.max(0, spent), avgRating: +avgRating.toFixed(1), count: players.length };
  }).sort((a, b) => b.avgRating - a.avgRating);

  const maxSpent = Math.max(...teamEfficiency.map(t => t.spent), 1);
  const totalPlayers = allBids.length;

  const tabs = [
    { id: "auction",  label: "Auction",  icon: BarChart3 },
    { id: "records",  label: "Records",  icon: Trophy },
    { id: "youth",    label: "Youth",    icon: Star },
    { id: "finance",  label: "Finance",  icon: DollarSign },
  ] as const;

  const YOUTH_ROLE_COLORS: Record<string, string> = {
    Batsman: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Bowler: "bg-red-500/20 text-red-300 border-red-500/30",
    "All-rounder": "bg-purple-500/20 text-purple-300 border-purple-500/30",
    Wicketkeeper: "bg-green-500/20 text-green-300 border-green-500/30",
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-3 bg-black/90 sticky top-0 z-10 backdrop-blur">
        <Button variant="ghost" size="sm" className="text-white/40 hover:text-white"
          onClick={() => setLocation("/auction")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <h1 className="text-sm font-bold tracking-wider text-white/90">ANALYTICS DASHBOARD</h1>
        </div>
        <div className="ml-auto flex gap-2">
          {tabs.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-white/40 hover:text-white/70"}`}
            >
              <tab.icon className="h-3 w-3" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-5">

        {/* ── AUCTION TAB ─────────────────────────────────────────────────── */}
        {activeTab === "auction" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Spent" value={`₹${totalSpent.toFixed(1)} Cr`} icon={DollarSign} color="text-yellow-400" sub="across all teams" />
              <StatCard label="Players Sold" value={totalPlayers} icon={Users} color="text-blue-400" sub="in this auction" />
              <StatCard label="Avg Price" value={totalPlayers ? `₹${(totalSpent / totalPlayers).toFixed(1)} Cr` : "—"} icon={Activity} color="text-purple-400" sub="per player" />
              <StatCard label="Avg Rating" value={allBids.length ? (allBids.reduce((s, b) => s + b.rating, 0) / allBids.length).toFixed(1) : "—"} icon={Star} color="text-orange-400" sub="skill rating" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Efficiency */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                  <Shield className="h-3 w-3" /> Team Avg Rating Ranking
                </h3>
                <div className="space-y-2.5">
                  {teamEfficiency.map((t, i) => (
                    <div key={t.name} className="flex items-center gap-2">
                      <span className="text-xs text-white/30 w-4">{i + 1}</span>
                      <span className="text-xs font-bold w-8" style={{ color: t.color }}>{t.name}</span>
                      <div className="flex-1">
                        <MiniBar value={t.avgRating} max={100} color={`bg-[${t.color}]`} />
                      </div>
                      <span className="text-xs text-white/60 w-8 text-right">{t.avgRating}</span>
                      <span className="text-xs text-white/30 w-12 text-right">{t.count} plrs</span>
                    </div>
                  ))}
                  {teamEfficiency.length === 0 && (
                    <p className="text-white/30 text-xs text-center py-4">No auction data — start an auction first</p>
                  )}
                </div>
              </div>

              {/* Role Breakdown */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                  <Target className="h-3 w-3" /> Auction Spend by Role
                </h3>
                <div className="space-y-3">
                  {Object.entries(roleStats).map(([role, stats]) => (
                    <div key={role}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={ROLE_COLORS[role] ?? "text-white/60"}>{role}</span>
                        <span className="text-white/50">{stats.count} players · ₹{stats.spend.toFixed(1)} Cr</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${ROLE_BG[role] ?? "bg-white"}`}
                          style={{ width: `${totalSpent > 0 ? (stats.spend / totalSpent) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {Object.keys(roleStats).length === 0 && (
                    <p className="text-white/30 text-xs text-center py-4">No data yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Best Value Picks */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                <Zap className="h-3 w-3 text-yellow-400" /> Best Value Picks (Rating ÷ Price)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {valuePicks.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-lg font-black text-white/20">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.player}</p>
                      <p className="text-xs text-white/40">{p.team} · ₹{p.price} Cr</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-400">{p.rating} <span className="text-white/30 text-xs">rating</span></p>
                      <p className="text-xs text-green-400">×{p.valueRatio} value</p>
                    </div>
                  </div>
                ))}
                {valuePicks.length === 0 && (
                  <p className="text-white/30 text-xs text-center py-4 col-span-2">No players acquired yet</p>
                )}
              </div>
            </div>

            {/* Biggest Bids */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-red-400" /> Biggest Auction Bids
              </h3>
              <div className="space-y-1.5">
                {biggestBids.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-white/25 w-5">{i + 1}</span>
                    <span className="flex-1 text-white/80 font-medium">{b.player}</span>
                    <span className="text-white/40">{b.team}</span>
                    <span className={`font-bold ${b.price >= 15 ? "text-red-400" : b.price >= 10 ? "text-orange-400" : "text-yellow-400"}`}>
                      ₹{b.price} Cr
                    </span>
                  </div>
                ))}
                {biggestBids.length === 0 && (
                  <p className="text-white/30 text-center py-4">No bids recorded yet</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── RECORDS TAB ─────────────────────────────────────────────────── */}
        {activeTab === "records" && (
          <>
            {records?.totalSeasons > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Seasons Played" value={records.totalSeasons} icon={Trophy} color="text-yellow-400" />
                  <StatCard label="Your Titles" value={records.totalChampionships} icon={Award} color="text-purple-400" />
                  <StatCard label="Top Run Scorer" value={records.orangeCapHistory?.[0]?.runs ?? "—"} sub={records.orangeCapHistory?.[0]?.name} icon={TrendingUp} color="text-orange-400" />
                  <StatCard label="Top Wicket-Taker" value={records.purpleCapHistory?.[0]?.wickets ?? "—"} sub={records.purpleCapHistory?.[0]?.name} icon={Zap} color="text-red-400" />
                </div>

                {/* Champion History */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3">🏆 Champion History</h3>
                  <div className="space-y-2">
                    {(records.championHistory ?? []).map((ch: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-xs bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-white/30">Season {ch.season}</span>
                        <span className="flex-1 font-bold" style={{ color: ch.color }}>{ch.champion}</span>
                        <span className="text-white/40">MoTS: {ch.motm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Orange Cap */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-orange-400/70 mb-3">🧡 Orange Cap History</h3>
                    <div className="space-y-1.5">
                      {(records.orangeCapHistory ?? []).slice(0, 5).map((oc: any, i: number) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <span className="text-white/30">S{oc.season}</span>
                          <span className="flex-1 text-white/80">{oc.name}</span>
                          <span className="text-white/40">{oc.team}</span>
                          <span className="text-orange-400 font-bold">{oc.runs} runs</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Purple Cap */}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-purple-400/70 mb-3">💜 Purple Cap History</h3>
                    <div className="space-y-1.5">
                      {(records.purpleCapHistory ?? []).slice(0, 5).map((pc: any, i: number) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <span className="text-white/30">S{pc.season}</span>
                          <span className="flex-1 text-white/80">{pc.name}</span>
                          <span className="text-white/40">{pc.team}</span>
                          <span className="text-purple-400 font-bold">{pc.wickets} wkts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Most Sixes */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3">💥 Most Sixes — All Time</h3>
                  <div className="space-y-1.5">
                    {(records.sixesHistory ?? []).slice(0, 5).map((s: any, i: number) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="text-white/30 w-4">{i + 1}</span>
                        <span className="text-white/30">S{s.season}</span>
                        <span className="flex-1 text-white/80">{s.name}</span>
                        <span className="text-white/40">{s.team}</span>
                        <span className="text-yellow-400 font-bold">{s.sixes} sixes</span>
                      </div>
                    ))}
                    {(records.sixesHistory ?? []).length === 0 && (
                      <p className="text-white/30 text-xs text-center py-4">No sixes data yet</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Trophy className="h-12 w-12 text-white/10 mb-4" />
                <p className="text-white/40 text-sm">No records yet</p>
                <p className="text-white/20 text-xs mt-1">Complete a season simulation to start building your hall of fame.</p>
              </div>
            )}
          </>
        )}

        {/* ── YOUTH ACADEMY TAB ───────────────────────────────────────────── */}
        {activeTab === "youth" && (
          <>
            <div className="text-center py-3">
              <h2 className="text-lg font-bold text-white">🌟 Youth Academy Prospects</h2>
              <p className="text-white/40 text-xs mt-1">
                {youth?.message ?? "Complete a season to discover new prospects."}
              </p>
            </div>

            {(youth?.prospects ?? []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(youth.prospects as any[]).map((p: any, i: number) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-white text-sm">{p.name}</p>
                        <p className="text-white/40 text-xs">{p.nationality} · Age {p.age}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${YOUTH_ROLE_COLORS[p.role] ?? "bg-white/10 text-white/50 border-white/20"}`}>
                        {p.role}
                      </span>
                    </div>

                    <p className="text-white/50 text-xs italic mb-3">"{p.trait}"</p>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/40">Current</span>
                          <span className="text-white/70">{p.currentRating}</span>
                        </div>
                        <MiniBar value={p.currentRating} max={100} color="bg-blue-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/40">Potential</span>
                          <span className="text-yellow-400 font-bold">{p.potential}</span>
                        </div>
                        <MiniBar value={p.potential} max={100} color="bg-yellow-500" />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-white/30">Growth ceiling</span>
                      <span className={`text-xs font-bold ${
                        p.potential >= 90 ? "text-red-400" :
                        p.potential >= 85 ? "text-orange-400" :
                        p.potential >= 80 ? "text-yellow-400" : "text-green-400"
                      }`}>
                        {p.potential >= 90 ? "⭐ ELITE" : p.potential >= 85 ? "🔥 STAR" : p.potential >= 80 ? "✨ GREAT" : "👍 GOOD"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Star className="h-12 w-12 text-white/10 mb-4" />
                <p className="text-white/40 text-sm">No prospects scouted yet</p>
                <p className="text-white/20 text-xs mt-1">Simulate a full season to unlock youth academy prospects.</p>
              </div>
            )}
          </>
        )}

        {/* ── FINANCE TAB ─────────────────────────────────────────────────── */}
        {activeTab === "finance" && (
          <>
            {(finance?.seasons ?? []).length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Total Income" value={`₹${finance.totalIncome} Cr`} icon={TrendingUp} color="text-green-400" />
                  <StatCard label="Total Expenses" value={`₹${finance.totalExpenses} Cr`} icon={Activity} color="text-red-400" />
                  <StatCard label="Net Profit" value={`₹${finance.totalProfit} Cr`} icon={DollarSign} color={finance.totalProfit >= 0 ? "text-green-400" : "text-red-400"} />
                  <StatCard label="Trend" value={finance.trend?.toUpperCase() ?? "—"} icon={BarChart3} color={finance.trend === "improving" ? "text-green-400" : "text-yellow-400"} />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-xs uppercase tracking-wider text-white/50 mb-4">💰 Season-by-Season Finances</h3>
                  <div className="space-y-3">
                    {(finance.seasons as any[]).map((f: any, i: number) => (
                      <div key={i} className="bg-white/5 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white/70 text-xs font-bold">Season {f.season}</span>
                          <span className={`text-xs font-bold ${f.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {f.netProfit >= 0 ? "+" : ""}₹{f.netProfit} Cr net
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-white/30">Prize Money</p>
                            <p className="text-yellow-400 font-bold">₹{f.prizeMoneyEarned} Cr</p>
                          </div>
                          <div>
                            <p className="text-white/30">Sponsorship</p>
                            <p className="text-blue-400 font-bold">₹{f.sponsorIncome} Cr</p>
                          </div>
                          <div>
                            <p className="text-white/30">Expenses</p>
                            <p className="text-red-400 font-bold">₹{f.totalExpenses} Cr</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <DollarSign className="h-12 w-12 text-white/10 mb-4" />
                <p className="text-white/40 text-sm">No financial data yet</p>
                <p className="text-white/20 text-xs mt-1">Simulate seasons to track your franchise finances.</p>
              </div>
            )}
          </>
        )}

      </div>

      {/* Footer */}
      <div className="text-center py-6 text-white/20 text-xs">Developed by Likith</div>
    </div>
  );
}
