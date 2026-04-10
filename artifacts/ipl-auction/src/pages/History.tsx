import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetAuctionHistory, getGetAuctionHistoryQueryKey, type AuctionHistoryEntry } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, CheckCircle, XCircle } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  Batsman: "text-blue-400",
  Bowler: "text-green-400",
  "All-rounder": "text-purple-400",
  Wicketkeeper: "text-amber-400",
};

export default function History() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: history = [], isLoading } = useGetAuctionHistory({
    query: { queryKey: getGetAuctionHistoryQueryKey() },
  });

  const filtered = history.filter((entry: AuctionHistoryEntry) => {
    if (search && !entry.playerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && entry.playerRole !== roleFilter) return false;
    if (statusFilter && entry.status !== statusFilter) return false;
    return true;
  });

  const soldCount = history.filter((e: AuctionHistoryEntry) => e.status === "sold").length;
  const unsoldCount = history.filter((e: AuctionHistoryEntry) => e.status === "unsold").length;
  const totalSpent = history
    .filter((e: AuctionHistoryEntry) => e.status === "sold")
    .reduce((s: number, e: AuctionHistoryEntry) => s + e.finalPrice, 0);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-3 bg-black/80 sticky top-0 z-10">
        <Button variant="ghost" size="sm" className="text-white/40 hover:text-white" onClick={() => setLocation("/auction")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Auction
        </Button>
        <span className="text-xs font-black text-white/30 uppercase tracking-widest">Auction History</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-white/5 rounded-xl p-4 text-center bg-green-500/5">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Sold</div>
            <div className="text-3xl font-black text-green-400">{soldCount}</div>
          </div>
          <div className="border border-white/5 rounded-xl p-4 text-center bg-white/2">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Unsold</div>
            <div className="text-3xl font-black text-white/40">{unsoldCount}</div>
          </div>
          <div className="border border-white/5 rounded-xl p-4 text-center bg-yellow-500/5">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Total Spent</div>
            <div className="text-3xl font-black font-mono text-yellow-400">₹{totalSpent.toFixed(1)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input
              type="search"
              placeholder="Search player..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-white/3 border border-white/10 focus:outline-none focus:border-white/20 text-white placeholder:text-white/20"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/3 border border-white/10 focus:outline-none text-white"
          >
            <option value="">All Roles</option>
            <option value="Batsman">Batsman</option>
            <option value="Bowler">Bowler</option>
            <option value="All-rounder">All-rounder</option>
            <option value="Wicketkeeper">Wicketkeeper</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/3 border border-white/10 focus:outline-none text-white"
          >
            <option value="">All Status</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-20 text-white/20">Loading history...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            {history.length === 0 ? "No auction history yet." : "No matches found."}
          </div>
        ) : (
          <div className="border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/30">#</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/30">Player</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/30">Role</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/30">Team</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-white/30">Price</th>
                  <th className="text-center px-4 py-3 text-[10px] uppercase tracking-widest text-white/30">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry: AuctionHistoryEntry) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-white/3 transition-colors hover:bg-white/2 ${
                      entry.status === "sold" ? "" : "opacity-50"
                    }`}
                  >
                    <td className="px-4 py-2.5 text-xs text-white/20 font-mono">{entry.id}</td>
                    <td className="px-4 py-2.5 font-bold text-white/80 text-sm">{entry.playerName}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${ROLE_COLORS[entry.playerRole] || "text-white/30"}`}>
                        {entry.playerRole}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-white/50">
                      {entry.teamName || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-white/70">
                      ₹{entry.finalPrice.toFixed(2)} Cr
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {entry.status === "sold" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="h-3 w-3" /> Sold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-white/25">
                          <XCircle className="h-3 w-3" /> Unsold
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
