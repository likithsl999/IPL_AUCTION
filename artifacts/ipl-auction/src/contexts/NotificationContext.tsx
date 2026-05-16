import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Trophy, Bell } from "lucide-react";

export type NotificationType = "success" | "error" | "info" | "achievement";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextValue {
  notify: (n: Omit<Notification, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  achievement: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = useCallback((n: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const duration = n.duration ?? 4000;
    setNotifications(prev => [...prev.slice(-4), { ...n, id }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => notify({ type: "success", title, message }), [notify]);
  const error = useCallback((title: string, message?: string) => notify({ type: "error", title, message }), [notify]);
  const info = useCallback((title: string, message?: string) => notify({ type: "info", title, message }), [notify]);
  const achievement = useCallback((title: string, message?: string) => notify({ type: "achievement", title, message, duration: 6000 }), [notify]);

  const icons: Record<NotificationType, React.ReactNode> = {
    success: <CheckCircle className="h-4 w-4 text-green-400" />,
    error: <AlertCircle className="h-4 w-4 text-red-400" />,
    info: <Bell className="h-4 w-4 text-cyan-400" />,
    achievement: <Trophy className="h-4 w-4 text-yellow-400" />,
  };
  const borders: Record<NotificationType, string> = {
    success: "border-green-500/20",
    error: "border-red-500/20",
    info: "border-cyan-500/20",
    achievement: "border-yellow-500/20",
  };

  return (
    <NotificationContext.Provider value={{ notify, success, error, info, achievement }}>
      {children}
      {/* Notification Toast Stack */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id}
            className={`pointer-events-auto flex items-start gap-3 bg-[#111]/90 backdrop-blur-md border ${borders[n.type]} rounded-xl px-4 py-3 shadow-2xl min-w-[260px] max-w-xs animate-in slide-in-from-right-4 duration-300`}>
            <div className="mt-0.5 flex-shrink-0">{icons[n.type]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold">{n.title}</div>
              {n.message && <div className="text-white/50 text-xs mt-0.5">{n.message}</div>}
            </div>
            <button onClick={() => dismiss(n.id)} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
