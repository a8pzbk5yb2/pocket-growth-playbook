import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowDownLeft, ArrowUpRight, BarChart3, CalendarDays, Clock, FileText, Users, Wallet, WalletCards, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import growth from "@/assets/powerbank-deposit.webp.asset.json";
import { meta } from "@/components/pb/shell";
import { Avatar, Demo, Section, StatCard, Status, Table, money } from "@/components/panel/ui";
import { fmtDate, useDemo, useLookups } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/")({ head: () => meta("Admin Overview", "Platform summary of sample users, deposits and investments."), component: Overview });
const ranges = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 } as const;
type R = keyof typeof ranges;
const MONTHS = ["Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov"];
function Pills({ v, set, opts }: { v: R; set: (r: R) => void; opts: R[] }) { return <div className="flex gap-1">{opts.map(o => <button key={o} onClick={() => set(o)} className={`rounded-full px-3 py-1 text-xs font-semibold ${v === o ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{o}</button>)}</div>; }

function Overview() {
  const d = useDemo(); const L = useLookups();
  const [rr, setRr] = useState<R>("6M"); const [ug, setUg] = useState<R>("6M");
  const deposits = d.requests.filter(r => r.kind === "deposit" && r.status === "approved").reduce((a, r) => a + r.amount, 0) + 2470000;
  const withdrawals = d.requests.filter(r => r.kind === "withdrawal" && r.status === "approved").reduce((a, r) => a + r.amount, 0) + 835000;
  const pick = (n: number) => MONTHS.slice(-Math.max(n, 2));
  const revenue = pick(ranges[rr] * (ranges[rr] === 1 ? 4 : 1)).map((m, i) => ({ m: ranges[rr] === 1 ? `W${i + 1}` : m, v: 400000 + i * 160000 + (i % 2) * 90000 }));
  const users = pick(ranges[ug]).map((m, i, a) => ({ m, v: i === a.length - 1 ? d.users.length * 500 + 2000 : 4000 + i * 1300 }));
  const pending = d.requests.filter(r => r.status === "pending").slice(0, 3);
  return <>
    <div className="relative overflow-hidden rounded-2xl bg-banner-gradient p-6 text-primary-foreground shadow-soft">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-extrabold md:text-3xl">Good Morning, Admin 👋</h2><p className="mt-1 text-primary-foreground/90">Here's what's happening with your PowerBank platform today.</p></div>
        <div className="flex items-center gap-3 md:mr-40"><CalendarDays className="h-8 w-8" /><div><p className="font-bold">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p><p className="text-sm text-primary-foreground/80">{new Date().toLocaleDateString("en-IN", { weekday: "long" })}</p></div></div></div>
      <img src={growth.url} alt="" className="absolute -bottom-4 right-2 hidden h-36 md:block" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Users} label="Total Users" value={(12816 + d.users.length).toLocaleString("en-IN")} trend="+12.8%" spark={[3,4,3,5,6,5,8]} />
      <StatCard icon={Wallet} label="Total Deposits" value={<>{money(deposits)}<Demo /></>} trend="+8.4%" spark={[4,3,5,4,6,7,7]} />
      <StatCard icon={WalletCards} color="bg-violet/12 text-violet" label="Total Withdrawals" value={<>{money(withdrawals)}<Demo /></>} trend="+5.2%" spark={[2,3,3,4,3,5,6]} />
      <StatCard icon={TrendingUp} label="Active Investments" value={(3200 + d.investments.filter(i => i.status === "active").length).toLocaleString("en-IN")} trend="+18.6%" spark={[2,4,5,5,7,8,9]} />
    </div>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="Platform Revenue" icon={BarChart3} action={<Pills v={rr} set={setRr} opts={["1M","3M","6M","1Y"]} />}>
        <div className="h-60"><ResponsiveContainer><AreaChart data={revenue}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v / 100000}L`} /><Tooltip formatter={(v: number) => [money(v) + " (sample)", "Revenue"]} /><Area dataKey="v" type="monotone" stroke="var(--primary)" strokeWidth={3} fill="var(--primary)" fillOpacity={0.12} dot={{ r: 4, fill: "var(--primary)" }} /></AreaChart></ResponsiveContainer></div>
      </Section>
      <Section title="User Growth" icon={Users} action={<Pills v={ug} set={setUg} opts={["1M","3M","6M"]} />}>
        <div className="h-60"><ResponsiveContainer><BarChart data={users}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="v" name="Users (sample)" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Section>
      <Section title="Recent Activity" icon={Activity} action={<Link to="/admin/transactions" className="text-sm font-semibold text-primary">View All →</Link>}>
        <ul className="space-y-3">{d.transactions.slice(0, 5).map((t, i) => { const u = L.user(t.userId); return <li key={t.id} className="flex items-center gap-3"><Avatar name={u?.name ?? "?"} /><div className="min-w-0 flex-1"><p className="truncate text-sm"><b>{u?.name}</b> {t.type.toLowerCase()}</p><p className="text-xs text-muted-foreground">{(i + 1) * 3} min ago</p></div><span className="text-sm font-bold text-primary">{money(t.amount)}</span></li>; })}</ul>
      </Section>
    </div>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section className="xl:col-span-2" title="Recent Transactions" icon={FileText} action={<Link to="/admin/transactions" className="text-sm font-semibold text-primary">View All →</Link>}>
        <Table head={["Transaction ID","User","Type","Amount","Status","Date"]}>{d.transactions.slice(0, 5).map(t => <tr key={t.id}><td className="px-3 py-2.5">{t.id}</td><td className="px-3"><span className="flex items-center gap-2"><Avatar name={L.user(t.userId)?.name ?? "?"} size="h-7 w-7" />{L.user(t.userId)?.name}</span></td><td className="px-3">{t.type === "Withdrawal" ? <ArrowDownLeft className="mr-1 inline h-4 w-4 text-success" /> : <ArrowUpRight className="mr-1 inline h-4 w-4 text-success" />}{t.type}</td><td className="px-3 font-semibold">{money(t.amount)}</td><td className="px-3"><Status s={t.status} /></td><td className="px-3 text-muted-foreground">{fmtDate(t.date, true)}</td></tr>)}</Table>
      </Section>
      <Section title="Pending Approvals" icon={Clock} action={<Link to="/admin/deposits" className="text-sm font-semibold text-primary">View All →</Link>}>
        {pending.length ? <ul className="space-y-4">{pending.map(r => <li key={r.id} className="flex items-center gap-3"><Avatar name={L.user(r.userId)?.name ?? "?"} /><div className="min-w-0 flex-1"><p className="text-sm font-bold capitalize">{r.kind} Request</p><p className="text-xs text-muted-foreground">{money(r.amount)} · {fmtDate(r.date, true)}</p></div>
          <div className="flex flex-col gap-1"><Button size="sm" className="h-7 rounded-full" onClick={() => { d.decide(r.id, "approved"); toast.success(`${r.id} approved (demo status only)`); }}>Approve</Button><Button size="sm" variant="outline" className="h-7 rounded-full border-destructive text-destructive" onClick={() => { d.decide(r.id, "rejected"); toast(`${r.id} rejected (demo)`); }}>Reject</Button></div></li>)}</ul> : <p className="py-6 text-center text-sm text-muted-foreground">All caught up — no pending demo requests.</p>}
      </Section>
    </div>
  </>;
}
