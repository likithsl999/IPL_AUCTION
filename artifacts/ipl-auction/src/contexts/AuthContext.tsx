import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  favoriteTeam: string;
  coins: number;
  careerData: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, favoriteTeam: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("ipl_token"));
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (t: string) => {
    try {
      const profile = await apiRequest<UserProfile>("/api/auth/me", {}, t);
      setUser(profile);
    } catch {
      localStorage.removeItem("ipl_token");
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, fetchMe]);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ token: string; user: UserProfile }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("ipl_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (username: string, email: string, password: string, favoriteTeam: string) => {
    const data = await apiRequest<{ token: string; user: UserProfile }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, favoriteTeam }),
    });
    localStorage.setItem("ipl_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("ipl_token");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    await apiRequest("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify({
        username: updates.username,
        favoriteTeam: updates.favoriteTeam,
        settings: updates.settings,
      }),
    }, token);
    if (user) setUser({ ...user, ...updates });
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout, updateProfile,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { apiRequest };
