import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/hotel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Profile — HotelPro" }, { name: "description", content: "Manage your HotelPro profile." },
    { property: "og:title", content: "Profile — HotelPro" }, { property: "og:description", content: "Manage your HotelPro profile." },
  ] }),
  component: () => <RequireRole roles={["guest", "staff", "admin"]}><Profile /></RequireRole>,
});

function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user!.name);
  const [phone, setPhone] = useState(user!.phone ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-5xl">Profile</h1>
      <form className="mt-8 space-y-4 rounded-xl border bg-card p-6" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try { setUser(await api.updateMe({ name, phone })); toast.success("Profile saved"); } catch (x) { toast.error(errMsg(x)); } finally { setBusy(false); }
      }}>
        <p className="text-sm text-muted-foreground">{user!.email} · <span className="capitalize">{user!.role}</span></p>
        <label className="block text-sm">Name<input className="field mt-1" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block text-sm">Phone<input className="field mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <Button disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </form>
    </div>
  );
}
