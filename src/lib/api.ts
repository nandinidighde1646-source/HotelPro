// HotelPro API client. Talks to the separate Express server (server/) via Axios.
// When VITE_API_URL is not set, a clearly-labelled browser-only DEMO MODE is used
// so the UI can be previewed. Demo mode is NOT a backend and is not secure.
import axios from "axios";
import * as demo from "./demo";

export const API_URL = import.meta.env["VITE_API_URL"] as string | undefined;
export const DEMO_MODE = !API_URL;

export type Role = "guest" | "staff" | "admin";
export type User = { _id: string; name: string; email: string; phone?: string | undefined; role: Role };
export type Room = {
  _id: string; number: string; name: string; type: "standard" | "deluxe" | "suite" | "family";
  description?: string | undefined; pricePerNight: number; capacity: number; amenities: string[]; images: string[];
  status: "available" | "occupied" | "cleaning" | "maintenance";
};
export type Booking = {
  _id: string; reference: string; guest: string | User; room: string | Room;
  checkIn: string; checkOut: string; guests: number; nights: number; nightlyRate: number;
  subtotal: number; taxes: number; total: number;
  paymentMethod: "demo_card" | "pay_at_hotel";
  paymentStatus: "unpaid" | "paid" | "refunded" | "refund_pending" | "failed";
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
  createdAt: string;
};
export type Quote = { nightlyRate: number; nights: number; subtotal: number; taxes: number; total: number };
export type RoomFilters = { type?: string | undefined; minPrice?: number | undefined; maxPrice?: number | undefined; guests?: number | undefined; amenities?: string | undefined; checkIn?: string | undefined; checkOut?: string | undefined };
export type ServiceRequest = { _id: string; type: string; details?: string | undefined; status: "open" | "in_progress" | "done"; room: Room | string; createdAt: string };
export type Summary = { rooms: number; occupied: number; occupancyRate: number; revenue: number; byStatus: { _id: string; count: number }[]; monthly: { _id: string; revenue: number }[] };

const TOKEN_KEY = "hotelpro_token";
export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

const http = axios.create(API_URL ? { baseURL: `${API_URL}/api` } : {});
http.interceptors.request.use((c) => {
  const t = tokenStore.get();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
export function errMsg(e: unknown) {
  if (axios.isAxiosError(e)) return (e.response?.data as { message?: string | undefined })?.message ?? e.message;
  return e instanceof Error ? e.message : "Something went wrong";
}

const real = {
  register: async (b: { name: string; email: string; password: string; phone?: string | undefined }) => (await http.post("/auth/register", b)).data as { token: string; user: User },
  login: async (b: { email: string; password: string }) => (await http.post("/auth/login", b)).data as { token: string; user: User },
  me: async () => (await http.get("/auth/me")).data.user as User,
  updateMe: async (b: { name?: string | undefined; phone?: string | undefined }) => (await http.patch("/auth/me", b)).data.user as User,
  rooms: async (f: RoomFilters) => (await http.get("/rooms", { params: f })).data.rooms as Room[],
  room: async (id: string) => (await http.get(`/rooms/${id}`)).data.room as Room,
  availability: async (id: string, checkIn: string, checkOut: string) => (await http.get(`/rooms/${id}/availability`, { params: { checkIn, checkOut } })).data.available as boolean,
  quote: async (b: { roomId: string; checkIn: string; checkOut: string; guests: number }) => (await http.post("/bookings/quote", b)).data.quote as Quote,
  createBooking: async (b: { roomId: string; checkIn: string; checkOut: string; guests: number; paymentMethod: "demo_card" | "pay_at_hotel"; demoCardLast4?: string | undefined; specialRequests?: string | undefined }) => (await http.post("/bookings", b)).data.booking as Booking,
  myBookings: async () => (await http.get("/bookings/mine")).data.bookings as Booking[],
  booking: async (ref: string) => (await http.get(`/bookings/${ref}`)).data.booking as Booking,
  cancel: async (ref: string) => (await http.post(`/bookings/${ref}/cancel`)).data.booking as Booking,
  allBookings: async (status?: string) => (await http.get("/bookings", { params: { status } })).data.bookings as Booking[],
  checkIn: async (ref: string) => (await http.post(`/bookings/${ref}/check-in`)).data.booking as Booking,
  checkOut: async (ref: string, collected?: boolean) => (await http.post(`/bookings/${ref}/check-out`, { collected })).data.booking as Booking,
  setRoomStatus: async (id: string, status: Room["status"]) => (await http.patch(`/rooms/${id}/status`, { status })).data.room as Room,
  createRoom: async (b: Omit<Room, "_id" | "status">) => (await http.post("/rooms", b)).data.room as Room,
  updateRoom: async (id: string, b: Partial<Room>) => (await http.patch(`/rooms/${id}`, b)).data.room as Room,
  services: async () => (await http.get("/services")).data.requests as ServiceRequest[],
  setServiceStatus: async (id: string, status: ServiceRequest["status"]) => (await http.patch(`/services/${id}`, { status })).data.request as ServiceRequest,
  users: async () => (await http.get("/admin/users")).data.users as User[],
  setRole: async (id: string, role: Role) => (await http.patch(`/admin/users/${id}/role`, { role })).data.user as User,
  summary: async () => (await http.get("/admin/reports/summary")).data as Summary,
  audit: async () => (await http.get("/admin/audit")).data.logs as { _id: string; action: string; createdAt: string; actor?: User }[],
};

export const api: typeof real = DEMO_MODE ? (demo.api as typeof real) : real;
