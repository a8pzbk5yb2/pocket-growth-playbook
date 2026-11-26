import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Eye, PieChart as PieIcon, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { meta } from "@/components/pb/shell";
import { Avatar, DateRange, Demo, Detail, ExportBtn, FilterSelect, SearchBox, Section, StatCard, Status, Table, Toolbar, inRange, money, usePaged } from "@/components/panel/ui";
import { api, apiConfigured, errMessage, invalidateAdminMoneyQueries, type ApiAdminInvestmentsPage } from "@/lib/api";
import { downloadCsv, fmtDate, useDemo, useLookups } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/investments")({ head: () => meta("Investments", "Platform investment records and analytics."), component: Investments });
const COLORS = ["var(--primary)", "var(--sky)", "var(--gold)", "var(--violet)", "var(--orange)"];
type RowInv = { id: string; userName: string; planName: string; amount: number; daily: number; duration: number; daysCredited: number; start: string; status: string };

function Investments() {
  const d = useDemo(); const L = useLookups(); const qc = useQueryClient();
  const real = apiConfigured();
  const [q, setQ] = useState(""); const [st, setSt] = useState("all"); const [pl, setPl] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apiQ = useQuery({ queryKey: ["admin-investments"], queryFn: () => api.get<ApiAdminInvestmentsPage>("/admin/investments"), enabled: real, staleTime: 15_000 });

  const all: RowInv[] = useMemo(() => {
    if (real) {
      return (apiQ.data?.items ?? []).map(i => ({ id: i.id, userName: i.userName, planName: i.planName, amount: i.amount, daily: i.daily, duration: i.duration, daysCredited: i.daysCredited, start: i.start, status: i.status }));
    }
    return d.investments.map(i => ({ id: i.id, userName: L.user(i.userId)?.name ?? "?", planName: L.plan(i.planId)?.name ?? "Removed plan", amount: i.amount, daily: i.daily, duration: i.duration, daysCredited: 0, start: i.start, status: i.status }));
  }, [real, apiQ.data?.items, d.investments, L]);

  const rows = useMemo(() => all.filter(i => (st === "all" || i.status === st) && (pl === "all" || i.planName === pl) && inRange(i.start, from, to) && [i.id, i.userName, i.planName].some(x => x.toLowerCase().includes(q.toLowerCase()))), [all, q, st, pl, from, to]);
  const { slice, pager } = usePaged(rows);

  const planOpts = real ? [...new Set(all.map(i => i.planName))] : d.plans.map(p => p.name);
  const total = real ? (apiQ.data?.counts.totalAmount ?? 0) : d.investments.reduce((a, i) => a + i.amount, 0);
  const activeCount = real ? (apiQ.data?.counts.active ?? 0) : d.investments.filter(i => i.status === "active").length;
  const completedCount = real ? (apiQ.data?.counts.completed ?? 0) : d.investments.filter(i => i.status === "completed").length;
  const fourthCount = real ? all.length : d.investments.filter(i => i.status === "pending").length;

  const monthly = real
    ? (apiQ.data?.monthly ?? [])
    : ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m, i) => ({ m, count: d.investments.filter((_, k) => k % 6 === i).length, value: d.investments.filter((_, k) => k % 6 === i).reduce((a, x) => a + x.amount, 0) }));
  const dist = real
    ? (apiQ.data?.distribution ?? [])
    : d.plans.map(p => ({ name: p.name, value: d.investments.filter(i => i.planId === p.id).length })).filter(x => x.value);

  const sel2 = selId ? all.find(i => i.id === selId) : undefined;

  const setStatus = async (id: string, next: "active" | "completed" | "pending") => {
    if (!real) { d.setInvestment(id, next); toast.success(`Marked ${next} (demo)`); return; }
    setBusy(true);
    try {
      await api.put(`/admin/investments/${id}`, { status: next });
      invalidateAdminMoneyQueries(qc);
      toast.success(`Investment ${id} marked ${next}`);
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };

  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Wallet} label={real ? "Total Investments" : "Total Demo Investments"} value={<>{money(total)}<Demo /></>} />
      <StatCard icon={TrendingUp} label="Active" value={activeCount} />
      <StatCard icon={CheckCircle2} color="bg-sky/12 text-sky" label="Completed" value={completedCount} />
      <StatCard icon={Clock} color="bg-warning/15 text-orange" label={real ? "Total Records" : "Pending"} value={fourthCount} />
    </div>
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="Investment Growth" icon={TrendingUp}><div className="h-56">{monthly.length ? <ResponsiveContainer><LineChart data={monthly.map((x, i, a) => ({ ...x, cum: a.slice(0, i + 1).reduce((s, y) => s + y.value, 0) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip formatter={(v: number) => money(v) + (real ? "" : " (sample)")} /><Line dataKey="cum" name="Cumulative" stroke="var(--primary)" strokeWidth={3} /></LineChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-muted-foreground">No investments yet.</p>}</div></Section>
      <Section title="Monthly Statistics" icon={TrendingUp}><div className="h-56">{monthly.length ? <ResponsiveContainer><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="count" name="Records" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-muted-foreground">No investments yet.</p>}</div></Section>
      <Section title="Plan Distribution" icon={PieIcon}><div className="h-56">{dist.length ? <ResponsiveContainer><PieChart><Pie data={dist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>{dist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-muted-foreground">No plan data yet.</p>}</div></Section>
    </div>
    <Section title="Investment Records" icon={Wallet} action={<ExportBtn onClick={() => downloadCsv(`powerbank-investments${real ? "" : "-demo"}.csv`, rows.map(i => ({ id: i.id, user: i.userName, plan: i.planName, amount: i.amount, daily: i.daily, duration_days: i.duration, start: fmtDate(i.start), status: i.status })))} />}>
      <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search ID or user" /><FilterSelect label="Status" value={st} onChange={setSt} options={real ? ["active", "completed"] : ["active", "completed", "pending"]} /><FilterSelect label="Plans" value={pl} onChange={setPl} options={planOpts} /><DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} /></Toolbar>
      {real && apiQ.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading investments…</p> : <>
        <Table empty={!rows.length} head={["Investment ID", "User", "Plan", "Amount", real ? "Daily Return" : "Illustrative Daily", "Duration", "Start Date", "Status", "Actions"]}>{slice.map(i => <tr key={i.id} className="hover:bg-muted/40"><td className="px-3 py-2.5 font-medium">{i.id}</td><td className="px-3"><span className="flex items-center gap-2"><Avatar name={i.userName} size="h-7 w-7" />{i.userName}</span></td><td className="px-3">{i.planName}</td><td className="px-3 font-semibold">{money(i.amount)}</td><td className="px-3">{money(i.daily)}/day{!real && "*"}</td><td className="px-3">{real ? `${i.daysCredited}/${i.duration} days` : `${i.duration} days`}</td><td className="px-3 whitespace-nowrap">{fmtDate(i.start)}</td><td className="px-3"><Status s={i.status} /></td><td className="px-3"><Button variant="ghost" size="sm" onClick={() => setSelId(i.id)}><Eye />View</Button></td></tr>)}</Table>
        {pager}{!real && <p className="mt-2 text-[11px] text-muted-foreground">* Illustrative label only. No returns are calculated, accrued or paid.</p>}
      </>}
    </Section>
    {sel2 && <Dialog open onOpenChange={o => !o && setSelId(null)}><DialogContent><DialogHeader><DialogTitle>Investment {sel2.id}</DialogTitle></DialogHeader>
      <Detail rows={[["User", sel2.userName], ["Plan", sel2.planName], ["Amount", money(sel2.amount)], [real ? "Daily Return" : "Illustrative label", `${money(sel2.daily)}/day`], ["Duration", real ? `${sel2.daysCredited}/${sel2.duration} days credited` : `${sel2.duration} days`], ["Start", fmtDate(sel2.start)], ["Status", <Status key="s" s={sel2.status} />]]} />
      <div className="flex flex-wrap gap-2">{(real ? (["active", "completed"] as const) : (["active", "completed", "pending"] as const)).filter(s => s !== sel2.status).map(s => <Button key={s} variant="outline" disabled={busy} className="capitalize" onClick={() => void setStatus(sel2.id, s)}>Mark {s}</Button>)}</div>
      {!real && <p className="text-xs text-muted-foreground"><Demo /> Sample record — not a financial product.</p>}</DialogContent></Dialog>}
  </>;
}
