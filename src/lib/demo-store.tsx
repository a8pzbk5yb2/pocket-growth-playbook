import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEMO_INVITE_CODES } from "./demo-data";

export type UserStatus = "active" | "inactive" | "blocked";
export type Kyc = "verified" | "pending" | "rejected";
export type DemoUser = { id: string; name: string; mobile: string; email?: string; joined: string; balance: number; status: UserStatus; kyc: Kyc; password: string; invite?: string; inviteCode: string };
export type PlanStatus = "active" | "inactive";
export type DemoPlan = { id: string; name: string; icon: "zap" | "star" | "crown" | "gem"; price: number; daily: number; duration: number; validity: string; description: string; status: PlanStatus };
export type InvStatus = "active" | "completed" | "pending";
export type DemoInvestment = { id: string; userId: string; planId: string; amount: number; daily: number; duration: number; start: string; status: InvStatus };
export type TxType = "Deposit" | "Withdrawal" | "Investment" | "Refund" | "Other";
export type TxStatus = "success" | "pending" | "failed";
export type DemoTx = { id: string; userId: string; type: TxType; amount: number; ref: string; status: TxStatus; date: string };
export type ReqStatus = "pending" | "approved" | "rejected";
export type DemoRequest = { id: string; kind: "deposit" | "withdrawal"; userId: string; amount: number; method: string; date: string; status: ReqStatus; note?: string };
export type DemoTask = { id: string; title: string; reward: number; status: "active" | "paused"; assigned: "all" | string; completedBy: string[] };
export type DemoNotification = { id: string; title: string; body: string; to: "all" | string[]; date: string; readBy: string[] };

const NAMES = ["Rohit Sharma","Priya Verma","Amit Singh","Sneha Patel","Vikas Kumar","Neha Gupta","Arjun Mehta","Kavya Nair","Rahul Joshi","Pooja Reddy","Sanjay Yadav","Anjali Das","Karan Malhotra","Meera Iyer","Deepak Chauhan","Ritu Kapoor","Manish Tiwari","Divya Menon","Suresh Pillai","Isha Bansal","Nikhil Rao","Tanvi Shah","Gaurav Saxena","Riyaj Khan"];
const day = (n: number) => new Date(Date.UTC(2026, 10, 25, 9, 42) - n * 86400000).toISOString();
const pick = <T,>(a: readonly T[], i: number) => a[i % a.length] as T;

function seed() {
  const users: DemoUser[] = NAMES.map((name, i) => ({
    id: `PB${(100231 + i * 137).toString()}`, name, mobile: `9${(812345670 + i * 7919).toString().slice(0, 9)}`,
    ...(i % 3 === 0 ? { email: `${name.split(" ")[0]!.toLowerCase()}@example.test` } : {}),
    joined: day(170 - i * 7), balance: (i * 1370) % 15000, status: pick<UserStatus>(["active","active","active","inactive","active","blocked"], i),
    kyc: pick<Kyc>(["verified","verified","pending","rejected"], i), password: "demo123",
    ...(i > 3 ? { invite: pick(DEMO_INVITE_CODES, i) } : {}), inviteCode: `PB${name.slice(0, 2).toUpperCase()}${i}`,
  }));
  const me = users[users.length - 1]!; me.id = "PB123456"; me.mobile = "9876543210"; me.status = "active"; me.inviteCode = "PB50RK";
  const plans: DemoPlan[] = [
    { id: "PL1", name: "Basic Plan", icon: "zap", price: 100, daily: 10, duration: 30, validity: "30 days", description: "Entry-level sample plan for exploring the prototype.", status: "active" },
    { id: "PL2", name: "Silver Plan", icon: "star", price: 500, daily: 60, duration: 30, validity: "30 days", description: "Popular sample tier shown for illustration.", status: "active" },
    { id: "PL3", name: "Gold Plan", icon: "crown", price: 1000, daily: 130, duration: 45, validity: "45 days", description: "Premium sample tier with crown badge.", status: "active" },
    { id: "PL4", name: "Diamond Plan", icon: "gem", price: 2000, daily: 280, duration: 60, validity: "60 days", description: "Top sample tier shown for illustration.", status: "active" },
  ];
  const investments: DemoInvestment[] = Array.from({ length: 36 }, (_, i) => { const p = pick(plans, i * 3 + 1); return { id: `INV${2026001 + i}`, userId: pick(users, i * 5).id, planId: p.id, amount: p.price, daily: p.daily, duration: p.duration, start: day(150 - i * 4), status: pick<InvStatus>(["active","active","completed","pending"], i) }; });
  const types: TxType[] = ["Withdrawal","Deposit","Investment","Withdrawal","Deposit","Refund","Other"];
  const transactions: DemoTx[] = Array.from({ length: 48 }, (_, i) => ({ id: `TXN2026112500${(i + 1).toString().padStart(2, "0")}`, userId: pick(users, i * 7).id, type: pick(types, i), amount: pick([2000,5000,1000,3000,10000,500,1500], i), ref: `REF${(874512 + i * 331).toString()}`, status: pick<TxStatus>(["success","success","pending","success","pending","failed"], i), date: new Date(Date.UTC(2026, 10, 25, 9, 42) - i * 3.7 * 3600000).toISOString() }));
  const requests: DemoRequest[] = Array.from({ length: 28 }, (_, i) => ({ id: `${i % 2 ? "WDR" : "DEP"}${(5001 + i).toString()}`, kind: i % 2 ? "withdrawal" : "deposit", userId: pick(users, i * 3 + (i < 2 ? 23 : 0)).id, amount: pick([10000,5000,2000,1000,3000,500], i), method: i % 2 ? pick(["Bank •••• 4521","UPI demo@okaxis"], i) : pick(["UPI","Bank Transfer","Card","Wallet"], i), date: new Date(Date.UTC(2026, 10, 25, 9, 18) - i * 5 * 3600000).toISOString(), status: pick<ReqStatus>(["pending","pending","approved","rejected","approved"], i) }));
  const tasks: DemoTask[] = [
    { id: "T1", title: "Daily Login", reward: 5, status: "active", assigned: "all", completedBy: users.slice(0, 14).map(u => u.id) },
    { id: "T2", title: "Watch Video", reward: 10, status: "active", assigned: "all", completedBy: users.slice(0, 9).map(u => u.id) },
    { id: "T3", title: "Share App", reward: 15, status: "active", assigned: "all", completedBy: users.slice(0, 6).map(u => u.id) },
    { id: "T4", title: "Read News", reward: 5, status: "active", assigned: "all", completedBy: users.slice(0, 11).map(u => u.id) },
    { id: "T5", title: "Complete Survey", reward: 20, status: "paused", assigned: "all", completedBy: users.slice(0, 3).map(u => u.id) },
  ];
  const notifications: DemoNotification[] = [
    { id: "N1", title: "Welcome to PowerBank Demo", body: "Explore every screen — all figures are sample data.", to: "all", date: day(2), readBy: [] },
    { id: "N2", title: "New sample plan added", body: "Diamond Plan is now visible in the plans list.", to: "all", date: day(1), readBy: [] },
    { id: "N3", title: "Deposit request update", body: "Your demo deposit request DEP5001 is pending review.", to: [me.id], date: day(0), readBy: [] },
  ];
  return { users, plans, investments, transactions, requests, tasks, notifications, currentUserId: null as string | null, adminUnread: 3 };
}

export type DemoState = ReturnType<typeof seed>;
let n = 0; const uid = (p: string) => `${p}${Date.now().toString().slice(-6)}${n++}`;

function useDemoCore() {
  const [s, set] = useState<DemoState>(seed);
  const up = (f: (d: DemoState) => DemoState) => set(f);
  const actions = {
    signup(v: { name: string; mobile: string; password: string; invite: string }) {
      const u: DemoUser = { id: `PB${(200000 + Math.floor(Math.random() * 799999)).toString()}`, name: v.name.trim(), mobile: v.mobile, joined: new Date().toISOString(), balance: 0, status: "active", kyc: "pending", password: v.password, invite: v.invite.trim().toUpperCase(), inviteCode: `PB${v.name.trim().slice(0, 2).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}` };
      up(d => ({ ...d, users: [...d.users, u], currentUserId: u.id, adminUnread: d.adminUnread + 1 })); return u;
    },
    login(mobile: string, password: string): string | null {
      const u = s.users.find(x => x.mobile === mobile);
      if (!u || u.password !== password) return "Incorrect mobile number or password";
      if (u.status === "blocked") return "This demo account is blocked by the admin";
      up(d => ({ ...d, currentUserId: u.id })); return null;
    },
    logout: () => up(d => ({ ...d, currentUserId: null })),
    addUser: (u: Omit<DemoUser, "id" | "joined" | "password" | "inviteCode">) => up(d => ({ ...d, users: [{ ...u, id: uid("PB"), joined: new Date().toISOString(), password: "demo123", inviteCode: uid("PBX") }, ...d.users] })),
    updateUser: (id: string, p: Partial<DemoUser>) => up(d => ({ ...d, users: d.users.map(u => u.id === id ? { ...u, ...p } : u) })),
    savePlan: (p: DemoPlan) => up(d => ({ ...d, plans: d.plans.some(x => x.id === p.id) ? d.plans.map(x => x.id === p.id ? p : x) : [...d.plans, p] })),
    deletePlan: (id: string) => up(d => ({ ...d, plans: d.plans.filter(p => p.id !== id) })),
    newPlanId: () => uid("PL"),
    setInvestment: (id: string, status: InvStatus) => up(d => ({ ...d, investments: d.investments.map(i => i.id === id ? { ...i, status } : i) })),
    requestInvestment: (userId: string, plan: DemoPlan) => up(d => ({ ...d, investments: [{ id: uid("INV"), userId, planId: plan.id, amount: plan.price, daily: plan.daily, duration: plan.duration, start: new Date().toISOString(), status: "pending" }, ...d.investments] })),
    createRequest: (r: Omit<DemoRequest, "id" | "date" | "status">) => up(d => ({ ...d, requests: [{ ...r, id: uid(r.kind === "deposit" ? "DEP" : "WDR"), date: new Date().toISOString(), status: "pending" }, ...d.requests], adminUnread: d.adminUnread + 1 })),
    decide(id: string, status: "approved" | "rejected") {
      up(d => {
        const r = d.requests.find(x => x.id === id); if (!r) return d;
        const note: DemoNotification = { id: uid("N"), title: `Demo ${r.kind} request ${status}`, body: `Your sample ${r.kind} request ${r.id} was ${status}. No real money was moved.`, to: [r.userId], date: new Date().toISOString(), readBy: [] };
        const tx: DemoTx = { id: uid("TXN"), userId: r.userId, type: r.kind === "deposit" ? "Deposit" : "Withdrawal", amount: r.amount, ref: r.id, status: status === "approved" ? "success" : "failed", date: new Date().toISOString() };
        return { ...d, requests: d.requests.map(x => x.id === id ? { ...x, status } : x), notifications: [note, ...d.notifications], transactions: [tx, ...d.transactions] };
      });
    },
    saveTask: (t: DemoTask) => up(d => ({ ...d, tasks: d.tasks.some(x => x.id === t.id) ? d.tasks.map(x => x.id === t.id ? t : x) : [...d.tasks, t] })),
    deleteTask: (id: string) => up(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) })),
    completeTask: (id: string, userId: string) => up(d => ({ ...d, tasks: d.tasks.map(t => t.id === id && !t.completedBy.includes(userId) ? { ...t, completedBy: [...t.completedBy, userId] } : t) })),
    newId: uid,
    notify: (title: string, body: string, to: "all" | string[]) => up(d => ({ ...d, notifications: [{ id: uid("N"), title, body, to, date: new Date().toISOString(), readBy: [] }, ...d.notifications] })),
    markRead: (id: string, who: string) => up(d => ({ ...d, notifications: d.notifications.map(x => x.id === id && !x.readBy.includes(who) ? { ...x, readBy: [...x.readBy, who] } : x) })),
    markAllRead: (who: string) => up(d => ({ ...d, notifications: d.notifications.map(x => x.readBy.includes(who) ? x : { ...x, readBy: [...x.readBy, who] }), adminUnread: who === "admin" ? 0 : d.adminUnread })),
  };
  return { ...s, ...actions };
}

type Ctx = ReturnType<typeof useDemoCore>;
const DemoCtx = createContext<Ctx | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) { const v = useDemoCore(); return <DemoCtx.Provider value={v}>{children}</DemoCtx.Provider>; }
export function useDemo() { const c = useContext(DemoCtx); if (!c) throw new Error("useDemo outside DemoProvider"); return c; }

export function useLookups() {
  const d = useDemo();
  return useMemo(() => ({
    user: (id: string) => d.users.find(u => u.id === id),
    plan: (id: string) => d.plans.find(p => p.id === id),
  }), [d.users, d.plans]);
}
export const notesFor = (list: DemoNotification[], userId: string) => list.filter(x => x.to === "all" || x.to.includes(userId));
export const fmtDate = (iso: string, time = false) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "Asia/Kolkata" });
export function downloadCsv(name: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["# SAMPLE DATA - DEMO ONLY", cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
