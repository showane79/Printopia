import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Real, server-backed admin auth. The session lives in an HttpOnly cookie set
// by the Worker; the browser never sees the session material. There is NO
// client-side "any password" fallback — login requires the real server.

export type DbState = "unknown" | "binding_missing" | "unreachable" | "ready";

export interface SetupStatus {
  loading: boolean;
  serverAvailable: boolean; // the /api worker responded with JSON
  dbState: DbState; // granular D1 availability reported by the server
  setupComplete: boolean; // an admin account exists
}

export interface LoginResult {
  ok: boolean;
  needSetup?: boolean;
  message?: string;
}

interface AdminAuthValue {
  isAuthed: boolean;
  status: SetupStatus;
  login: (password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AdminAuthValue | null>(null);

const OFFLINE: SetupStatus = { loading: false, serverAvailable: false, dbState: "unknown", setupComplete: false };

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [status, setStatus] = useState<SetupStatus>({
    loading: true,
    serverAvailable: false,
    dbState: "unknown",
    setupComplete: false,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/status", { headers: { Accept: "application/json" } });
      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok || !ct.includes("application/json")) {
        setStatus(OFFLINE);
        setIsAuthed(false);
        return;
      }
      const data = (await res.json()) as { dbState?: DbState; setupComplete?: boolean; authed?: boolean };
      setStatus({
        loading: false,
        serverAvailable: true,
        dbState: data.dbState ?? "unknown",
        setupComplete: !!data.setupComplete,
      });
      setIsAuthed(!!data.authed);
    } catch {
      setStatus(OFFLINE);
      setIsAuthed(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (password: string): Promise<LoginResult> => {
    if (!password) return { ok: false, message: "لطفاً رمز عبور را وارد کنید." };
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ password }),
      });
      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json");
      if (res.ok && isJson) {
        setIsAuthed(true);
        return { ok: true };
      }
      if (!isJson) {
        return { ok: false, message: "بخش سرور در دسترس نیست؛ ابتدا سایت را با کد جدید منتشر کنید." };
      }
      const data = (await res.json().catch(() => ({}))) as { message?: string; needSetup?: boolean };
      if (res.status === 409 && data.needSetup) {
        return { ok: false, needSetup: true, message: data.message ?? "ابتدا راه‌اندازی را کامل کنید." };
      }
      return { ok: false, message: data.message ?? "ورود ناموفق بود." };
    } catch {
      return { ok: false, message: "اتصال به سرور برقرار نشد." };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", headers: { "Content-Type": "application/json" } });
    } catch {
      /* ignore */
    }
    setIsAuthed(false);
  }, []);

  return <Ctx.Provider value={{ isAuthed, status, login, logout, refresh }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return c;
}
