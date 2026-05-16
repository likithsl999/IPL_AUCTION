import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Trophy, Eye, EyeOff, Loader2, UserPlus, Shield } from "lucide-react";

const IPL_TEAMS = [
  { id: "CSK", name: "Chennai Super Kings", color: "#F9CD1C" },
  { id: "MI", name: "Mumbai Indians", color: "#004BA0" },
  { id: "RCB", name: "Royal Challengers Bengaluru", color: "#EC1C24" },
  { id: "KKR", name: "Kolkata Knight Riders", color: "#3A225D" },
  { id: "DC", name: "Delhi Capitals", color: "#0078BC" },
  { id: "PBKS", name: "Punjab Kings", color: "#ED1B24" },
  { id: "RR", name: "Rajasthan Royals", color: "#254AA5" },
  { id: "SRH", name: "Sunrisers Hyderabad", color: "#F7811E" },
  { id: "GT", name: "Gujarat Titans", color: "#1C4F9C" },
  { id: "LSG", name: "Lucknow Super Giants", color: "#A72056" },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "", favoriteTeam: "CSK" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.favoriteTeam);
      setLocation("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-600 mb-4 shadow-lg shadow-yellow-500/20">
            <Trophy className="h-8 w-8 text-black" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Create Account</h1>
          <p className="text-white/40 text-sm mt-1">Join IPL Auction 2026</p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Username</label>
                <input
                  value={form.username} onChange={set("username")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
                  placeholder="YourUsername"
                  required minLength={3}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email" value={form.email} onChange={set("email")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Favorite IPL Team</label>
              <select
                value={form.favoriteTeam} onChange={set("favoriteTeam")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-400/50 transition-all"
              >
                {IPL_TEAMS.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#1a1a1a]">{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password} onChange={set("password")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
                  placeholder="Min. 6 characters"
                  required minLength={6}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Confirm Password</label>
              <input
                type="password" value={form.confirmPassword} onChange={set("confirmPassword")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
                placeholder="Repeat your password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
            )}

            <Button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black font-bold rounded-xl py-3 text-sm transition-all shadow-lg shadow-yellow-500/20"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              {loading ? "Creating Account…" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-white/30 text-sm">
              Already have an account?{" "}
              <button onClick={() => setLocation("/login")}
                className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                Sign in
              </button>
            </p>
          </div>
          <button onClick={() => setLocation("/")}
            className="w-full mt-3 text-white/20 hover:text-white/40 text-xs transition-colors">
            Continue as guest →
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-white/20 text-xs">
          <Shield className="h-3 w-3" />
          <span>Passwords are encrypted with bcrypt</span>
        </div>
        <p className="text-center text-white/15 text-[10px] mt-4">Developed by Likith</p>
      </div>
    </div>
  );
}
