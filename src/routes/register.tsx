import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AuthShell } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [
    { title: "Create account — HotelPro" }, { name: "description", content: "Create a HotelPro guest account to book rooms." },
    { property: "og:title", content: "Create account — HotelPro" }, { property: "og:description", content: "Create a HotelPro guest account to book rooms." },
  ] }),
  component: Register,
});

function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <AuthShell title="Create account">
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        if (f.password.length < 8) return setErr("Password must be at least 8 characters");
        setBusy(true); setErr("");
        try { await register({ name: f.name, email: f.email, password: f.password, phone: f.phone || undefined }); nav({ to: "/rooms" }); }
        catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
      }}>
        <label className="block text-sm">Full name<input className="field mt-1" required minLength={2} value={f.name} onChange={up("name")} /></label>
        <label className="block text-sm">Email<input className="field mt-1" type="email" required value={f.email} onChange={up("email")} /></label>
        <label className="block text-sm">Phone (optional)<input className="field mt-1" value={f.phone} onChange={up("phone")} /></label>
        <label className="block text-sm">Password<input className="field mt-1" type="password" required minLength={8} value={f.password} onChange={up("password")} /></label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create guest account"}</Button>
        <p className="text-center text-sm text-muted-foreground">Have an account? <Link to="/login" className="text-primary underline">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
