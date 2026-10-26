import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore, type User } from "./api";

type Ctx = { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<User>; register: (b: { name: string; email: string; password: string; phone?: string | undefined }) => Promise<User>; logout: () => void; setUser: (u: User) => void };
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    api.me().then(setUser).catch(() => tokenStore.set(null)).finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => { const r = await api.login({ email, password }); tokenStore.set(r.token); setUser(r.user); return r.user; };
  const register = async (b: { name: string; email: string; password: string; phone?: string | undefined }) => { const r = await api.register(b); tokenStore.set(r.token); setUser(r.user); return r.user; };
  const logout = () => { tokenStore.set(null); setUser(null); };
  return <AuthCtx.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthCtx.Provider>;
}
export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
