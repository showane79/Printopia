import { createContext, useContext, useState, type ReactNode } from "react";

// IMPORTANT: this is an app-level gate for the in-browser admin preview.
// Real network-level authentication is enforced server-side by the Cloudflare
// Pages Functions in /functions (PBKDF2 password + HttpOnly session cookie).
// The login() below calls that endpoint first; only if it is not deployed
// does it fall back to a clearly-labelled local preview session.

export type AuthMode = "none" | "server" | "demo";

export interface LoginResult {
  ok: boolean;
  mode: AuthMode | "error";
  message?: string;
}

interface AdminAuthValue {
  isAuthed: boolean;
  authMode: AuthMode;
  login: (password: string) => Promise<LoginResult>;
  logout: () => void;
}

const Ctx = createContext<AdminAuthValue | null>(null);
const KEY = "printopia-admin-session";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const [authMode, setAuthMode] = useState<AuthMode>("none");

  async function login(password: string): Promise<LoginResult> {
    // 1) Try the real server endpoint (deployed on Cloudflare Pages).
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      if (res.ok && isJson) {
        // Real server responded with JSON → genuine authenticated session.
        setIsAuthed(true);
        setAuthMode("server");
        try {
          sessionStorage.setItem(KEY, "1");
        } catch {
          /* ignore */
        }
        return { ok: true, mode: "server" };
      }
      // Distinguish a genuine auth rejection from an unconfigured server.
      // 401 (wrong password) / 429 (rate limited) are real failures and must
      // NOT fall back to preview (that would be a security bypass).
      if ((res.status === 401 || res.status === 429) && isJson) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, mode: "error", message: data.message || "رمز عبور نادرست است یا تلاش‌ها محدود شده است." };
      }
      // Any other outcome (500 = env not set, 404, non-JSON HTML, or network
      // error) means the secure server is not ready → fall through to the
      // clearly-labelled local preview gate so the panel stays usable.
    } catch {
      // offline / no server → fall through to local preview gate.
    }

    // 2) Local preview gate (NOT a security boundary — README documents this).
    if (password.trim().length === 0) {
      return { ok: false, mode: "error", message: "لطفاً رمز عبور را وارد کنید." };
    }
    setIsAuthed(true);
    setAuthMode("demo");
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    return { ok: true, mode: "demo" };
  }

  function logout() {
    fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setIsAuthed(false);
    setAuthMode("none");
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  return <Ctx.Provider value={{ isAuthed, authMode, login, logout }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return c;
}
