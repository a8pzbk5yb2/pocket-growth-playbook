import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Eye, PieChart as PieIcon, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { meta } from "@/components/pb/shell";
import { Avatar, DateRange, Demo, Detail, ExportBtn, FilterSelect, SearchBox, Section, StatCard, Status, Table, Toolbar, inRange, money, usePaged } from "@/components/panel/ui";
import { downloadCsv, fmtDate, useDemo, useLookups, type DemoInvestment } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/investments")({ head: () => meta("Investments", "Illustrative sample investment records and analytics."), component: Investments });
const COLORS = ["var(--primary)", "var(--sky)", "var(--gold)", "var(--violet)", "var(--orange)"];
function Investments() {
  const d = useDemo(); const L = useLookups();
  const [q, setQ] = useState(""); const [st, setSt] = useState("all"); const [pl, setPl] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [sel, setSel] = useState<DemoInvestment | null>(null);
  const rows = useMemo(() => d.investments.filter(i => (st === "all" || i.status === st) && (pl === "all" || L.plan(i.planId)?.name === pl) && inRange(i.start, from, to) && [i.id, L.user(i.userId)?.name ?? ""].some(x => x.toLowerCase().includes(q.toLowerCase()))), [d.investments, q, st, pl, from, to, L]);
  const { slice, pager } = usePaged(rows);
  const c = (s: string) => d.investments.filter(i => i.status === s).length;
  const total = d.investments.reduce((a, i) => a + i.amount, 0);
  const monthly = ["Jun","Jul","Aug","Sep","Oct","Nov"].map((m, i) => ({ m, count: d.investments.filter((_, k) => k % 6 === i).length, value: d.investments.filter((_, k) => k % 6 === i).reduce((a, x) => a + x.amount, 0) }));
  const dist = d.plans.map(p => ({ name: p.name, value: d.investments.filter(i => i.planId === p.id).length })).filter(x => x.value);
  const sel2 = sel ? d.investments.find(i => i.id === sel.id) : undefined;
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Wallet} label="Total Demo Investments" value={<>{money(total)}<Demo /></>} /><StatCard icon={TrendingUp} label="Active" value={c("active")} /><StatCard icon={CheckCircle2} color="bg-sky/12 text-sky" label="Completed" value={c("completed")} /><StatCard icon={Clock} color="bg-warning/15 text-orange" label="Pending" value={c("pending")} /></div>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="Investment Growth" icon={TrendingUp}><div className="h-56"><ResponsiveContainer><LineChart data={monthly.map((x, i, a) => ({ ...x, cum: a.slice(0, i + 1).reduce((s, y) => s + y.value, 0) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip formatter={(v: number) => money(v) + " (sample)"} /><Line dataKey="cum" name="Cumulative" stroke="var(--primary)" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Section>
      <Section title="Monthly Statistics" icon={TrendingUp}><div className="h-56"><ResponsiveContainer><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="count" name="Records" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Section>
      <Section title="Plan Distribution" icon={PieIcon}><div className="h-56"><ResponsiveContainer><PieChart><Pie data={dist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>{dist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></Section>
    </div>
    <Section title="Investment Records" icon={Wallet} action={<ExportBtn onClick={() => downloadCsv("powerbank-investments-demo.csv", rows.map(i => ({ id: i.id, user: L.user(i.userId)?.name ?? "", plan: L.plan(i.planId)?.name ?? "", amount: i.amount, illustrative_daily: i.daily, duration_days: i.duration, start: fmtDate(i.start), status: i.status })))} />}>
      <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search ID or user" /><FilterSelect label="Status" value={st} onChange={setSt} options={["active","completed","pending"]} /><FilterSelect label="Plans" value={pl} onChange={setPl} options={d.plans.map(p => p.name)} /><DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} /></Toolbar>
      <Table empty={!rows.length} head={["Investment ID","User","Plan","Amount","Illustrative Daily","Duration","Start Date","Status","Actions"]}>{slice.map(i => <tr key={i.id} className="hover:bg-muted/40"><td className="px-3 py-2.5 font-medium">{i.id}</td><td className="px-3"><span className="flex items-center gap-2"><Avatar name={L.user(i.userId)?.name ?? "?"} size="h-7 w-7" />{L.user(i.userId)?.name}</span></td><td className="px-3">{L.plan(i.planId)?.name ?? "Removed plan"}</td><td className="px-3 font-semibold">{money(i.amount)}</td><td className="px-3">{money(i.daily)}/day*</td><td className="px-3">{i.duration} days</td><td className="px-3 whitespace-nowrap">{fmtDate(i.start)}</td><td className="px-3"><Status s={i.status} /></td><td className="px-3"><Button variant="ghost" size="sm" onClick={() => setSel(i)}><Eye />View</Button></td></tr>)}</Table>
      {pager}<p className="mt-2 text-[11px] text-muted-foreground">* Illustrative label only. No returns are calculated, accrued or paid.</p>
    </Section>
    {sel2 && <Dialog open onOpenChange={o => !o && setSel(null)}><DialogContent><DialogHeader><DialogTitle>Investment {sel2.id}</DialogTitle></DialogHeader>
      <Detail rows={[["User", L.user(sel2.userId)?.name], ["Plan", L.plan(sel2.planId)?.name ?? "—"], ["Amount", money(sel2.amount)], ["Illustrative label", `${money(sel2.daily)}/day`], ["Duration", `${sel2.duration} days`], ["Start", fmtDate(sel2.start)], ["Status", <Status key="s" s={sel2.status} />]]} />
      <div className="flex flex-wrap gap-2">{(["active","completed","pending"] as const).filter(s => s !== sel2.status).map(s => <Button key={s} variant="outline" className="capitalize" onClick={() => { d.setInvestment(sel2.id, s); toast.success(`Marked ${s} (demo)`); }}>Mark {s}</Button>)}</div>
      <p className="text-xs text-muted-foreground"><Demo /> Sample record — not a financial product.</p></DialogContent></Dialog>}
  </>;
}
