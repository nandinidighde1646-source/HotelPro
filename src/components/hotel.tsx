import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DEMO_MODE, type Role, type Room } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import suite from "@/assets/room-suite.jpg";
import deluxe from "@/assets/room-deluxe.jpg";

export const roomImage = (r: Room) => (r.images?.[0]?.startsWith("http") ? r.images[0] : r.images?.[0] === "suite" ? suite : deluxe);
export const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
export const fmtDate = (s: string) => new Date(s.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const isoDay = (offset = 0) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };

export function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      {DEMO_MODE && (
        <div className="bg-accent px-4 py-1.5 text-center text-xs text-accent-foreground">
          Demo mode — no server connected. Data is simulated in this browser only. Set VITE_API_URL to use the Express API.
        </div>
      )}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="font-display text-2xl font-semibold text-primary">Hotel<span className="text-brass">Pro</span></Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/rooms" className="hover:text-brass" activeProps={{ className: "text-brass" }}>Rooms</Link>
          {user?.role === "guest" && <Link to="/bookings" className="hover:text-brass" activeProps={{ className: "text-brass" }}>My bookings</Link>}
          {(user?.role === "staff" || user?.role === "admin") && <Link to="/staff" className="hover:text-brass" activeProps={{ className: "text-brass" }}>Front desk</Link>}
          {user?.role === "admin" && <Link to="/admin" className="hover:text-brass" activeProps={{ className: "text-brass" }}>Admin</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile" className="hidden text-sm sm:block">{user.name} <span className="text-muted-foreground">· {user.role}</span></Link>
              <Button variant="outline" size="sm" onClick={() => { logout(); nav({ to: "/" }); }}>Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/register">Register</Link></Button>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto border-t px-4 py-2 text-sm md:hidden">
        <Link to="/rooms">Rooms</Link>
        {user?.role === "guest" && <Link to="/bookings">Bookings</Link>}
        {(user?.role === "staff" || user?.role === "admin") && <Link to="/staff">Front desk</Link>}
        {user?.role === "admin" && <Link to="/admin">Admin</Link>}
        {user && <Link to="/profile">Profile</Link>}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div><p className="font-display text-2xl">HotelPro</p><p className="mt-2 text-sm opacity-70">An academic MERN hotel management project.</p></div>
        <div className="text-sm opacity-80"><p className="eyebrow mb-2">Visit</p><p>12 Linden Avenue</p><p>Check-in 14:00 · Check-out 11:00</p></div>
        <div className="text-sm opacity-80"><p className="eyebrow mb-2">Policies</p><p>Free cancellation up to 48 hours before check-in.</p><p>Card payments are simulated.</p></div>
      </div>
    </footer>
  );
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <State icon="error" title="Please sign in" action={<Button asChild><Link to="/login">Sign in</Link></Button>} />;
  if (!roles.includes(user.role)) return <State icon="error" title="You don't have access to this page" />;
  return <>{children}</>;
}

export const Loading = ({ label = "Loading…" }: { label?: string | undefined }) => (
  <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{label}</div>
);
export function State({ icon, title, body, action }: { icon: "empty" | "error"; title: string; body?: string | undefined; action?: ReactNode }) {
  const I = icon === "error" ? AlertCircle : Inbox;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <I className={icon === "error" ? "h-8 w-8 text-destructive" : "h-8 w-8 text-muted-foreground"} />
      <h2 className="mt-4 text-2xl">{title}</h2>
      {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const tone: Record<string, string> = {
  confirmed: "bg-primary text-primary-foreground", checked_in: "bg-success text-primary-foreground", checked_out: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive text-destructive-foreground", pending: "bg-warning text-foreground", paid: "bg-success text-primary-foreground",
  unpaid: "bg-warning text-foreground", refunded: "bg-secondary text-secondary-foreground", available: "bg-success text-primary-foreground",
  occupied: "bg-primary text-primary-foreground", cleaning: "bg-warning text-foreground", maintenance: "bg-destructive text-destructive-foreground",
};
export const StatusBadge = ({ s }: { s: string }) => <Badge className={`border-0 capitalize ${tone[s] ?? ""}`}>{s.replace("_", " ")}</Badge>;

export function SearchBar({ initial }: { initial?: { checkIn?: string | undefined; checkOut?: string | undefined; guests?: number | undefined } }) {
  const nav = useNavigate();
  const [checkIn, setCI] = useState(initial?.checkIn ?? isoDay(7));
  const [checkOut, setCO] = useState(initial?.checkOut ?? isoDay(9));
  const [guests, setG] = useState(initial?.guests ?? 2);
  const [err, setErr] = useState("");
  return (
    <form
      className="grid gap-3 rounded-xl bg-card p-4 shadow-soft sm:grid-cols-4"
      onSubmit={(e) => { e.preventDefault(); if (checkOut <= checkIn) return setErr("Check-out must be after check-in"); setErr(""); nav({ to: "/rooms", search: { checkIn, checkOut, guests } }); }}
    >
      <label className="text-xs text-muted-foreground">Check-in<input className="field mt-1 text-foreground" type="date" min={isoDay()} value={checkIn} onChange={(e) => setCI(e.target.value)} required /></label>
      <label className="text-xs text-muted-foreground">Check-out<input className="field mt-1 text-foreground" type="date" min={checkIn} value={checkOut} onChange={(e) => setCO(e.target.value)} required /></label>
      <label className="text-xs text-muted-foreground">Guests<input className="field mt-1 text-foreground" type="number" min={1} max={10} value={guests} onChange={(e) => setG(Number(e.target.value))} /></label>
      <Button type="submit" variant="brass" className="h-auto self-end py-2.5">Check availability</Button>
      {err && <p className="text-sm text-destructive sm:col-span-4">{err}</p>}
    </form>
  );
}

export function RoomCard({ room, search }: { room: Room; search?: { checkIn?: string | undefined; checkOut?: string | undefined; guests?: number | undefined } }) {
  return (
    <Link to="/rooms/$id" params={{ id: room._id }} search={search ?? {}} className="group overflow-hidden rounded-xl border bg-card transition hover:shadow-soft">
      <div className="aspect-[4/3] overflow-hidden"><img src={roomImage(room)} alt={room.name} loading="lazy" width={1200} height={800} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
      <div className="p-5">
        <p className="eyebrow">{room.type} · up to {room.capacity}</p>
        <h3 className="mt-1 text-2xl">{room.name}</h3>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-sm text-muted-foreground">{room.amenities.slice(0, 3).join(" · ")}</p>
          <p><span className="font-display text-2xl text-primary">{money(room.pricePerNight)}</span><span className="text-xs text-muted-foreground"> /night</span></p>
        </div>
      </div>
    </Link>
  );
}
