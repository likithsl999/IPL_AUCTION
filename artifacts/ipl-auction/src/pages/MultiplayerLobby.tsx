import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { io, Socket } from "socket.io-client";
import {
  Users, Plus, Globe, Lock, ArrowLeft, Send, Crown,
  Check, Loader2, Trophy, MessageCircle, Zap, Copy
} from "lucide-react";

interface RoomPlayer {
  userId: number; username: string; teamId: string;
  budget: number; ready: boolean; isHost: boolean;
}
interface ChatMessage {
  id: string; userId: number; username: string;
  text: string; type: "user" | "system"; timestamp: number;
}
interface Room {
  id: string; name: string; hostId: number;
  players: RoomPlayer[]; maxPlayers: number;
  isPrivate: boolean; status: string;
  difficulty: string; playerCount: number; budget: number;
  chat: ChatMessage[];
}
interface PublicRoom {
  id: string; name: string; players: RoomPlayer[];
  maxPlayers: number; isPrivate: boolean; status: string;
}

const IPL_TEAMS = [
  { id:"CSK", name:"Chennai Super Kings", color:"#F9CD1C" },
  { id:"MI",  name:"Mumbai Indians",      color:"#004BA0" },
  { id:"RCB", name:"RCB",                 color:"#EC1C24" },
  { id:"KKR", name:"Kolkata Knight Riders",color:"#3A225D"},
  { id:"DC",  name:"Delhi Capitals",      color:"#0078BC" },
  { id:"PBKS",name:"Punjab Kings",        color:"#ED1B24" },
  { id:"RR",  name:"Rajasthan Royals",    color:"#254AA5" },
  { id:"SRH", name:"Sunrisers Hyderabad", color:"#F7811E" },
  { id:"GT",  name:"Gujarat Titans",      color:"#1C4F9C" },
  { id:"LSG", name:"Lucknow Super Giants",color:"#A72056" },
];

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function MultiplayerLobby() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [view, setView] = useState<"lobby" | "create" | "room">("lobby");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: "", teamId: "CSK", isPrivate: false, password: "",
    difficulty: "medium", playerCount: 100, budget: 100,
  });

  // Connect socket
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const s = io(window.location.origin, {
      path: `${BASE}/api/socket.io`,
      transports: ["websocket", "polling"],
    });
    s.on("connect", () => {
      setConnected(true);
      s.emit("auth", { userId: user.id, username: user.username });
      s.emit("get-rooms");
    });
    s.on("disconnect", () => setConnected(false));
    s.on("room-list", (rooms: PublicRoom[]) => setPublicRooms(rooms));
    s.on("room-created", ({ room }: { roomId: string; room: Room }) => {
      setCurrentRoom(room);
      setView("room");
    });
    s.on("room-updated", (room: Room) => setCurrentRoom(room));
    s.on("chat-message", (msg: ChatMessage) => {
      setCurrentRoom(prev => prev ? { ...prev, chat: [...prev.chat, msg].slice(-100) } : prev);
    });
    s.on("error", (msg: string) => setError(msg));
    s.on("auction-started", () => {
      setLocation("/auction");
    });
    setSocket(s);
    return () => { s.disconnect(); };
  }, [isAuthenticated, user, BASE, setLocation]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [currentRoom?.chat]);

  const handleCreate = useCallback(() => {
    if (!socket) return;
    setError("");
    socket.emit("create-room", createForm);
  }, [socket, createForm]);

  const handleJoin = useCallback((roomId: string, teamId = "CSK", password = "") => {
    if (!socket) return;
    setError("");
    socket.emit("join-room", { roomId, teamId, password });
  }, [socket]);

  const handleReady = useCallback(() => { socket?.emit("toggle-ready"); }, [socket]);
  const handleStart = useCallback(() => { socket?.emit("start-room-auction"); }, [socket]);
  const handleLeave = useCallback(() => {
    socket?.emit("leave-room");
    setCurrentRoom(null);
    setView("lobby");
  }, [socket]);

  const handleChat = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit("chat", chatInput.trim());
    setChatInput("");
  }, [socket, chatInput]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">Sign in to play multiplayer</h2>
          <p className="text-white/40 text-sm mb-6">Create an account to join live auction rooms with other players.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setLocation("/login")} className="bg-yellow-400 text-black font-bold">Sign In</Button>
            <Button onClick={() => setLocation("/register")} variant="outline" className="border-white/10 text-white">Register</Button>
          </div>
        </div>
      </div>
    );
  }

  const myPlayer = currentRoom?.players.find(p => p.userId === user?.id);
  const nonHosts = currentRoom?.players.filter(p => !p.isHost) ?? [];
  const allReady = nonHosts.every(p => p.ready) && currentRoom?.players.length! > 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { view === "room" ? handleLeave() : setLocation("/"); }}
          className="text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Globe className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-bold text-white">Multiplayer</span>
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
          <span className="text-xs text-white/30">{connected ? "Online" : "Connecting…"}</span>
        </div>
      </div>

      {/* LOBBY VIEW */}
      {view === "lobby" && (
        <div className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold">Public Rooms</h2>
            <Button onClick={() => setView("create")} size="sm"
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold">
              <Plus className="h-3 w-3 mr-1" /> Create Room
            </Button>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}

          {publicRooms.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-10 text-center">
              <Globe className="h-8 w-8 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No open rooms right now</p>
              <p className="text-white/20 text-xs mt-1">Create one and invite friends!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {publicRooms.map(room => (
                <div key={room.id} className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{room.name}</div>
                    <div className="text-white/30 text-xs mt-0.5">
                      {room.players.length}/{room.maxPlayers} players · {room.status}
                    </div>
                  </div>
                  {room.isPrivate && <Lock className="h-3.5 w-3.5 text-white/30" />}
                  <Button size="sm" onClick={() => handleJoin(room.id)}
                    disabled={room.status !== "waiting" || room.players.length >= room.maxPlayers}
                    className="bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs hover:bg-cyan-400/20">
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE ROOM VIEW */}
      {view === "create" && (
        <div className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
          <h2 className="text-white font-bold">Create Auction Room</h2>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Room Name</label>
              <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
                placeholder={`${user?.username}'s Room`} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Your Team</label>
              <select value={createForm.teamId} onChange={e => setCreateForm(f => ({ ...f, teamId: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                {IPL_TEAMS.map(t => <option key={t.id} value={t.id} className="bg-[#1a1a1a]">{t.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Difficulty</label>
                <select value={createForm.difficulty} onChange={e => setCreateForm(f => ({ ...f, difficulty: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none">
                  {["easy","medium","hard","extreme"].map(d => <option key={d} value={d} className="bg-[#1a1a1a] capitalize">{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Budget (Cr)</label>
                <input type="number" value={createForm.budget} min={50} max={200}
                  onChange={e => setCreateForm(f => ({ ...f, budget: Number(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={createForm.isPrivate}
                onChange={e => setCreateForm(f => ({ ...f, isPrivate: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <span className="text-white/60 text-sm">Private Room (require password)</span>
            </label>

            {createForm.isPrivate && (
              <input value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
                placeholder="Room password" />
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setView("lobby")} variant="ghost" className="flex-1 text-white/40">Cancel</Button>
              <Button onClick={handleCreate} className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold">
                <Plus className="h-4 w-4 mr-2" /> Create Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ROOM VIEW */}
      {view === "room" && currentRoom && (
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
          {/* Room header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-white font-bold">{currentRoom.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/30">Room ID:</span>
                  <code className="text-xs text-cyan-400 font-mono">{currentRoom.id}</code>
                  <button onClick={() => navigator.clipboard.writeText(currentRoom.id)}
                    className="text-white/20 hover:text-white/50 transition-colors"><Copy className="h-3 w-3" /></button>
                </div>
              </div>
              {error && <div className="text-red-400 text-xs bg-red-500/10 px-3 py-1 rounded-lg">{error}</div>}
            </div>

            {/* Players */}
            <div className="grid grid-cols-2 gap-2">
              {currentRoom.players.map(p => {
                const team = IPL_TEAMS.find(t => t.id === p.teamId);
                return (
                  <div key={p.userId} className="bg-white/5 rounded-xl p-3 flex items-center gap-2">
                    {p.isHost && <Crown className="h-3 w-3 text-yellow-400 flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm font-semibold truncate">{p.username}</div>
                      <div className="text-xs font-bold" style={{ color: team?.color ?? "#fff" }}>{p.teamId}</div>
                    </div>
                    {p.ready ? (
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="h-3 w-3 text-green-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/5" />
                    )}
                  </div>
                );
              })}
              {Array.from({ length: Math.max(0, currentRoom.maxPlayers - currentRoom.players.length) }).map((_, i) => (
                <div key={i} className="bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-white/10" />
                  <span className="text-white/20 text-sm italic">Waiting…</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              {myPlayer && !myPlayer.isHost && (
                <Button onClick={handleReady} size="sm"
                  className={`flex-1 text-xs font-bold ${myPlayer.ready ? "bg-green-500/20 border border-green-500/30 text-green-400" : "bg-white/5 border border-white/10 text-white"}`}>
                  <Check className="h-3 w-3 mr-1" /> {myPlayer.ready ? "Ready!" : "Mark Ready"}
                </Button>
              )}
              {myPlayer?.isHost && (
                <Button onClick={handleStart} size="sm" disabled={!allReady && currentRoom.players.length < 2}
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold">
                  <Zap className="h-3 w-3 mr-1" /> Start Auction
                </Button>
              )}
              <Button onClick={handleLeave} size="sm" variant="ghost" className="text-red-400/50 hover:text-red-400 text-xs">
                Leave
              </Button>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col p-4">
            <div className="flex items-center gap-2 mb-2 text-xs text-white/30 font-semibold uppercase tracking-wider">
              <MessageCircle className="h-3 w-3" /> Chat
            </div>
            <div ref={chatRef} className="flex-1 min-h-0 max-h-60 overflow-y-auto space-y-1 mb-3 pr-1">
              {(currentRoom.chat ?? []).map(msg => (
                <div key={msg.id} className={`text-sm ${msg.type === "system" ? "text-white/30 italic" : "text-white"}`}>
                  {msg.type === "user" && <span className="text-yellow-400 font-semibold mr-1">{msg.username}:</span>}
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleChat} className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-all"
                placeholder="Say something…" maxLength={200} />
              <Button type="submit" size="sm" className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/20">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <p className="text-center text-white/15 text-[10px] py-3">Developed by Likith</p>
    </div>
  );
}
