import type { Server as SocketServer, Socket } from "socket.io";
import { IPL_TEAMS } from "./teams";
import { buildAllPlayers, slicePlayers } from "./players-seed";

export interface RoomPlayer {
  userId: number;
  username: string;
  socketId: string;
  teamId: string;
  budget: number;
  ready: boolean;
  isHost: boolean;
}

export interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  text: string;
  type: "user" | "system";
  timestamp: number;
}

export interface MultiplayerRoom {
  id: string;
  name: string;
  hostId: number;
  players: RoomPlayer[];
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  status: "waiting" | "in-auction" | "finished";
  difficulty: string;
  playerCount: number;
  budget: number;
  chat: ChatMessage[];
  auctionState: Record<string, unknown> | null;
  createdAt: number;
}

const rooms = new Map<string, MultiplayerRoom>();

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getPublicRooms(): Omit<MultiplayerRoom, "password" | "auctionState">[] {
  return Array.from(rooms.values())
    .filter((r) => !r.isPrivate && r.status === "waiting")
    .map(({ password: _p, auctionState: _a, ...rest }) => rest);
}

export function getRoom(id: string): MultiplayerRoom | undefined {
  return rooms.get(id);
}

function broadcastRoomList(io: SocketServer): void {
  io.emit("room-list", getPublicRooms());
}

export function setupMultiplayer(io: SocketServer): void {
  io.on("connection", (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentUser: { userId: number; username: string } | null = null;

    socket.on("auth", (data: { userId: number; username: string }) => {
      currentUser = data;
    });

    socket.on("get-rooms", () => {
      socket.emit("room-list", getPublicRooms());
    });

    socket.on("create-room", (data: {
      name: string;
      isPrivate: boolean;
      password?: string;
      difficulty: string;
      playerCount: number;
      budget: number;
      teamId: string;
    }) => {
      if (!currentUser) { socket.emit("error", "Not authenticated"); return; }

      const roomId = generateRoomId();
      const room: MultiplayerRoom = {
        id: roomId,
        name: data.name || `${currentUser.username}'s Room`,
        hostId: currentUser.userId,
        players: [{
          userId: currentUser.userId,
          username: currentUser.username,
          socketId: socket.id,
          teamId: data.teamId,
          budget: data.budget,
          ready: false,
          isHost: true,
        }],
        maxPlayers: 4,
        isPrivate: data.isPrivate ?? false,
        password: data.password,
        status: "waiting",
        difficulty: data.difficulty ?? "medium",
        playerCount: data.playerCount ?? 100,
        budget: data.budget ?? 100,
        chat: [],
        auctionState: null,
        createdAt: Date.now(),
      };
      rooms.set(roomId, room);
      currentRoomId = roomId;
      socket.join(roomId);

      const systemMsg: ChatMessage = {
        id: Date.now().toString(),
        userId: 0,
        username: "System",
        text: `${currentUser.username} created the room`,
        type: "system",
        timestamp: Date.now(),
      };
      room.chat.push(systemMsg);

      socket.emit("room-created", { roomId, room });
      broadcastRoomList(io);
    });

    socket.on("join-room", (data: { roomId: string; password?: string; teamId: string }) => {
      if (!currentUser) { socket.emit("error", "Not authenticated"); return; }
      const room = rooms.get(data.roomId);
      if (!room) { socket.emit("error", "Room not found"); return; }
      if (room.status !== "waiting") { socket.emit("error", "Auction already started"); return; }
      if (room.players.length >= room.maxPlayers) { socket.emit("error", "Room is full"); return; }
      if (room.isPrivate && room.password && room.password !== data.password) {
        socket.emit("error", "Wrong password"); return;
      }
      const takenTeams = room.players.map((p) => p.teamId);
      if (takenTeams.includes(data.teamId)) {
        socket.emit("error", "Team already taken"); return;
      }
      const player: RoomPlayer = {
        userId: currentUser.userId,
        username: currentUser.username,
        socketId: socket.id,
        teamId: data.teamId,
        budget: room.budget,
        ready: false,
        isHost: false,
      };
      room.players.push(player);
      currentRoomId = data.roomId;
      socket.join(data.roomId);

      const msg: ChatMessage = {
        id: Date.now().toString(),
        userId: 0,
        username: "System",
        text: `${currentUser.username} joined the room`,
        type: "system",
        timestamp: Date.now(),
      };
      room.chat.push(msg);
      io.to(data.roomId).emit("room-updated", room);
      io.to(data.roomId).emit("chat-message", msg);
      broadcastRoomList(io);
    });

    socket.on("toggle-ready", () => {
      if (!currentRoomId || !currentUser) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.userId === currentUser!.userId);
      if (player) {
        player.ready = !player.ready;
        io.to(currentRoomId).emit("room-updated", room);
      }
    });

    socket.on("start-room-auction", () => {
      if (!currentRoomId || !currentUser) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      if (room.hostId !== currentUser.userId) { socket.emit("error", "Only host can start"); return; }
      const nonHosts = room.players.filter((p) => !p.isHost);
      const allReady = nonHosts.every((p) => p.ready) || nonHosts.length === 0;
      if (!allReady) { socket.emit("error", "Not all players are ready"); return; }

      room.status = "in-auction";
      const allPlayers = buildAllPlayers();
      const players = slicePlayers(allPlayers, room.playerCount === 0 ? "full" : room.playerCount);
      const teams = IPL_TEAMS.map((t) => {
        const roomPlayer = room.players.find((p) => p.teamId === t.id);
        return {
          ...t,
          budget: room.budget,
          remainingBudget: room.budget,
          players: [],
          isUser: !!roomPlayer,
          controlledBy: roomPlayer?.userId,
        };
      });
      room.auctionState = {
        players,
        teams,
        playerIndex: 0,
        currentPlayer: players[0],
        currentBid: players[0]?.basePrice ?? 0.2,
        currentBidder: null,
        status: "bidding",
        totalPlayers: players.length,
      };

      const startMsg: ChatMessage = {
        id: Date.now().toString(),
        userId: 0,
        username: "System",
        text: "Auction has started! Good luck!",
        type: "system",
        timestamp: Date.now(),
      };
      room.chat.push(startMsg);
      io.to(currentRoomId).emit("auction-started", room.auctionState);
      io.to(currentRoomId).emit("chat-message", startMsg);
      broadcastRoomList(io);
    });

    socket.on("place-bid", (data: { amount: number }) => {
      if (!currentRoomId || !currentUser) return;
      const room = rooms.get(currentRoomId);
      if (!room?.auctionState) return;
      const state = room.auctionState as Record<string, unknown>;
      const player = room.players.find((p) => p.userId === currentUser!.userId);
      if (!player) return;

      const current = (state["currentBid"] as number) ?? 0;
      if (data.amount <= current) { socket.emit("error", "Bid too low"); return; }

      state["currentBid"] = data.amount;
      state["currentBidder"] = { userId: currentUser.userId, username: currentUser.username, teamId: player.teamId };

      const bidMsg: ChatMessage = {
        id: Date.now().toString(),
        userId: currentUser.userId,
        username: "System",
        text: `${currentUser.username} bids ₹${data.amount} Cr!`,
        type: "system",
        timestamp: Date.now(),
      };
      room.chat.push(bidMsg);
      io.to(currentRoomId).emit("bid-placed", { state, message: bidMsg });
      io.to(currentRoomId).emit("chat-message", bidMsg);
    });

    socket.on("chat", (text: string) => {
      if (!currentRoomId || !currentUser) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const clean = String(text).slice(0, 200).trim();
      if (!clean) return;
      const msg: ChatMessage = {
        id: Date.now().toString(),
        userId: currentUser.userId,
        username: currentUser.username,
        text: clean,
        type: "user",
        timestamp: Date.now(),
      };
      room.chat.push(msg);
      if (room.chat.length > 100) room.chat = room.chat.slice(-100);
      io.to(currentRoomId).emit("chat-message", msg);
    });

    socket.on("leave-room", () => {
      handleLeave(socket, io, currentRoomId, currentUser);
      currentRoomId = null;
    });

    socket.on("disconnect", () => {
      handleLeave(socket, io, currentRoomId, currentUser);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms.entries()) {
      if (room.status === "finished" || (room.status === "waiting" && now - room.createdAt > 3_600_000)) {
        rooms.delete(id);
      }
    }
  }, 60_000);
}

function handleLeave(
  socket: Socket,
  io: SocketServer,
  roomId: string | null,
  user: { userId: number; username: string } | null,
): void {
  if (!roomId || !user) return;
  const room = rooms.get(roomId);
  if (!room) return;
  room.players = room.players.filter((p) => p.socketId !== socket.id);
  socket.leave(roomId);

  if (room.players.length === 0) {
    rooms.delete(roomId);
  } else {
    if (room.hostId === user.userId && room.players.length > 0) {
      room.players[0]!.isHost = true;
      room.hostId = room.players[0]!.userId;
    }
    const leaveMsg: ChatMessage = {
      id: Date.now().toString(),
      userId: 0,
      username: "System",
      text: `${user.username} left the room`,
      type: "system",
      timestamp: Date.now(),
    };
    room.chat.push(leaveMsg);
    io.to(roomId).emit("room-updated", room);
    io.to(roomId).emit("chat-message", leaveMsg);
  }
  broadcastRoomList(io);
}
