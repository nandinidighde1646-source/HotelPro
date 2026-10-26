import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DEMO_MODE, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Sign in — HotelPro" }, { name: "description", content: "Sign in to manage your HotelPro bookings." },
    { property: "og:title", content: "Sign in — HotelPro" }, { property: "og:description", content: "Sign in to manage your HotelPro bookings." },
  ] }),
  component: Login,
});

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-16"><h1 className="text-5xl">{title}</h1><div className="mt-8 rounded-xl border bg-card p-6 shadow-soft">{children}</div></div>;
}

function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <AuthShell title="Welcome back">
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr("");
        try { const u = await login(email, password); nav({ to: u.role === "admin" ? "/admin" : u.role === "staff" ? "/staff" : "/bookings" }); }
        catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
      }}>
        <label className="block text-sm">Email<input className="field mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block text-sm">Password<input className="field mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <p className="text-center text-sm text-muted-foreground">New here? <Link to="/register" className="text-primary underline">Create an account</Link></p>
      </form>
      {DEMO_MODE && (
        <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
          <p className="font-semibold">Demo accounts</p>
          <p>guest@hotelpro.test / Guest123!</p><p>staff@hotelpro.test / Staff123!</p><p>admin@hotelpro.test / Admin123!</p>
        </div>
      )}
    </AuthShell>
  );
}
