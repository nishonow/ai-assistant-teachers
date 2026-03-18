import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchCurrentSession, loginWithAdapter, registerWithAdapter } from "./adapter";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "./storage";
import type { AuthSession, LoginInput, RegisterInput } from "./types";

interface AuthContextValue {
  session: AuthSession | null;
  isHydrating: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<AuthSession>;
  register: (input: RegisterInput) => Promise<AuthSession>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      const storedSession = loadAuthSession();
      if (!storedSession) {
        if (!cancelled) {
          setSession(null);
          setIsHydrating(false);
        }
        return;
      }

      if (storedSession.kind !== "backend") {
        if (!cancelled) {
          setSession(storedSession);
          setIsHydrating(false);
        }
        return;
      }

      try {
        const nextSession = await fetchCurrentSession(storedSession.token);
        if (cancelled) return;
        saveAuthSession(nextSession);
        setSession(nextSession);
      } catch {
        if (cancelled) return;
        clearAuthSession();
        setSession(null);
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    }

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<AuthSession> => {
    const nextSession = await loginWithAdapter(input);
    saveAuthSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<AuthSession> => {
    const nextSession = await registerWithAdapter(input);
    saveAuthSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isHydrating,
      isAuthenticated: Boolean(session),
      login,
      register,
      logout,
    }),
    [session, isHydrating, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}

