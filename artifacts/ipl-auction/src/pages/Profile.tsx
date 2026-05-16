import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, apiRequest } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  User, Trophy, Star, Coins, LogOut, Save, Loader2,
  BarChart3, Shield, ChevronRight, Medal, Zap, RotateCcw
} from "lucide-react";

const TEAM_COLORS: Record<string, string> = {
  CSK:"#F9CD1C", MI:"#004BA0", RCB:"#EC1C24", KKR:"#3A225D",
  DC:"#0078BC", PBKS:"#ED1B24", RR:"#254AA5", SRH:"#F7811E",
  GT:"#1C4F9C", LSG:"#A72056",
};
const IPL_TEAMS = ["CSK","MI","RCB","KKR","DC","PBKS","RR","SRH","GT","LSG"];

interface Achievement { type: string; data: Record<string,unknown>; earned_at: string; }
interface SaveSlot { slot_name: string; save_data: Record<string,unknown>; updated_at: string; }

const ACHIEVEMENT_LABELS: Record<string, { label: string; icon: string }> = {
  first_win: { label: "First Win", icon: "🏆" },
  big_spender: { label: "Big Spender", icon: "💰" },
  budget_master: { label: "Budget Master", icon: "🎯" },
  champion: { label: "IPL Champion", icon: "🌟" },
  triple_crown: { label: "Triple Crown", icon: "👑" },
};

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, token, logout, updateProfile } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; stats: Record<string,unknown> } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: user?.username ?? "", favoriteTeam: user?.favoriteTeam ?? "CSK" });
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    Promise.all([
      fetch(`${base}/api/auth/achievements`, { headers: h }).then(r => r.json()),
      fetch(`${base}/api/saves`, { headers: h }).then(r => r.json()),
      fetch(`${base}/api/leaderboard/my-rank`, { headers: h }).then(r => r.json()),
    ]).then(([a, s, r]) => {
      setAchievements(Array.isArray(a) ? a : []);
      setSaves(Array.isArray(s) ? s : []);
      setMyRank(r && !r.error ? r : null);
    }).catch(() => {});
  }, [token]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ username: editForm.username, favoriteTeam: editForm.favoriteTeam });
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const handleDeleteSlot = async (slot: string) => {
    if (!token) return;
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    await fetch(`${base}/api/saves/${slot}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setSaves(prev => prev.filter(s => s.slot_name !== slot));
    setResetConfirm(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-4">You need to be logged in</p>
          <Button onClick={() => setLocation("/login")} className="bg-yellow-400 text-black font-bold">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const teamColor = TEAM_COLORS[user.favoriteTeam] ?? "#F9CD1C";
  const joinDate = new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setLocation("/")} className="text-white/40 hover:text-white text-sm transition-colors flex items-center gap-1">
          ← Back
        </button>
        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Profile</span>
        <button onClick={() => { logout(); setLocation("/"); }} className="flex items-center gap-1.5 text-red-400/60 hover:text-red-400 text-xs transition-colors">
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
              style={{ background: `linear-gradient(135deg, ${teamColor}33, ${teamColor}11)`, border: `2px solid ${teamColor}44` }}>
              {user.username.slice(0,1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50"
                  />
                  <select value={editForm.favoriteTeam} onChange={e => setEditForm(f => ({ ...f, favoriteTeam: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                    {IPL_TEAMS.map(t => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProfile} disabled={saving}
                      className="bg-yellow-400 text-black text-xs font-bold flex-1">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-white/40 text-xs flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-black text-white">{user.username}</h2>
                  <p className="text-white/40 text-sm">{user.email}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${teamColor}22`, color: teamColor }}>
                      {user.favoriteTeam}
                    </span>
                    <span className="text-white/30 text-xs">Joined {joinDate}</span>
                  </div>
                  <button onClick={() => setEditing(true)} className="mt-3 text-xs text-yellow-400/60 hover:text-yellow-400 transition-colors">
                    Edit Profile →
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/5">
            <div className="text-center">
              <div className="text-2xl font-black text-yellow-400">{(myRank?.stats as Record<string,unknown>)?.titles as number ?? 0}</div>
              <div className="text-white/30 text-xs mt-0.5">Titles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-cyan-400">{(myRank?.stats as Record<string,unknown>)?.auction_wins as number ?? 0}</div>
              <div className="text-white/30 text-xs mt-0.5">Auction Wins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-green-400">#{myRank?.rank ?? "—"}</div>
              <div className="text-white/30 text-xs mt-0.5">Global Rank</div>
            </div>
          </div>
        </div>

        {/* Coins */}
        <div className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border border-yellow-400/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-white font-bold">{user.coins.toLocaleString()} Coins</div>
              <div className="text-white/30 text-xs">In-game currency</div>
            </div>
          </div>
          <Zap className="h-4 w-4 text-yellow-400/40" />
        </div>

        {/* Achievements */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Medal className="h-4 w-4" /> Achievements ({achievements.length})
          </h3>
          {achievements.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-4">No achievements yet — keep playing!</p>
          ) : (
            <div className="space-y-2">
              {achievements.map((a, i) => {
                const info = ACHIEVEMENT_LABELS[a.type] ?? { label: a.type, icon: "🎯" };
                return (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                    <span className="text-xl">{info.icon}</span>
                    <div className="flex-1">
                      <div className="text-white text-sm font-semibold">{info.label}</div>
                      <div className="text-white/30 text-xs">{new Date(a.earned_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Save Slots */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Save className="h-4 w-4" /> Cloud Save Slots
          </h3>
          {["slot_1", "slot_2", "slot_3"].map(slot => {
            const saved = saves.find(s => s.slot_name === slot);
            const slotNum = slot.split("_")[1];
            return (
              <div key={slot} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 font-bold text-sm">
                  {slotNum}
                </div>
                <div className="flex-1 min-w-0">
                  {saved ? (
                    <>
                      <div className="text-white text-sm font-semibold">
                        {(saved.save_data as Record<string,string>)?.teamName ?? "Saved Game"}
                      </div>
                      <div className="text-white/30 text-xs">{new Date(saved.updated_at).toLocaleString()}</div>
                    </>
                  ) : (
                    <div className="text-white/25 text-sm italic">Empty slot</div>
                  )}
                </div>
                {saved && (
                  <button onClick={() => setResetConfirm(slot)} className="text-red-400/40 hover:text-red-400 transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Nav Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setLocation("/leaderboard")}
            className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/8 transition-all text-left">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <div>
              <div className="text-white text-sm font-semibold">Leaderboard</div>
              <div className="text-white/30 text-xs">Global rankings</div>
            </div>
          </button>
          <button onClick={() => setLocation("/analytics")}
            className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/8 transition-all text-left">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <div>
              <div className="text-white text-sm font-semibold">Analytics</div>
              <div className="text-white/30 text-xs">Season stats</div>
            </div>
          </button>
        </div>

        {/* Reset Confirm */}
        {resetConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#111] border border-red-500/20 rounded-2xl p-6 w-full max-w-xs text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-white font-bold mb-2">Delete Save Slot?</h3>
              <p className="text-white/40 text-sm mb-5">This will permanently delete your saved game data. This cannot be undone.</p>
              <div className="flex gap-3">
                <Button onClick={() => setResetConfirm(null)} variant="ghost" className="flex-1 text-white/50">Cancel</Button>
                <Button onClick={() => handleDeleteSlot(resetConfirm)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold">Delete</Button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-white/15 text-[10px] pb-4">Developed by Likith</p>
      </div>
    </div>
  );
}
