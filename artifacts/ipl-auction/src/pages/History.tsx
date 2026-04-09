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
  const totalSpent = history.filter((e: AuctionHistoryEntry) => e.status === "sold").reduce((s: number, e: AuctionHistoryEntry) => s + e.finalPrice, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3 bg-card/50 sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/auction")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Auction
        </Button>
        <span className="font-bold text-sm">Auction History</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sold</div>
            <div className="text-2xl font-black text-green-400">{soldCount}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Unsold</div>
            <div className="text-2xl font-black text-muted-foreground">{unsoldCount}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Spent</div>
            <div className="text-2xl font-black font-mono">₹{totalSpent.toFixed(2)} Cr</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search player..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md bg-card border border-border focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md bg-card border border-border focus:outline-none text-foreground"
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
            className="px-3 py-1.5 text-sm rounded-md bg-card border border-border focus:outline-none text-foreground"
          >
            <option value="">All Status</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading history...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {history.length === 0 ? "No auction history yet." : "No matches found."}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">#</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Player</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Team</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Price</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry: AuctionHistoryEntry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{entry.id}</td>
                    <td className="px-4 py-3 font-medium">{entry.playerName}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${ROLE_COLORS[entry.playerRole] || "text-muted-foreground"}`}>
                        {entry.playerRole}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.teamName ? (
                        <span className="text-foreground">{entry.teamName}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      ₹{entry.finalPrice.toFixed(2)} Cr
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.status === "sold" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="h-3 w-3" /> Sold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
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
