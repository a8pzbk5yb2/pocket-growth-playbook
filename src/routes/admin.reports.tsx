import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart, Printer } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { meta } from "@/components/pb/shell";
import { DateRange, ExportBtn, Section, inRange, money } from "@/components/panel/ui";
import { api, apiConfigured, type ApiAdminReport } from "@/lib/api";
import { downloadCsv, fmtDate, useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/reports")({ head: () => meta("Reports", "Reports with CSV and PDF export."), component: Reports });
const KINDS = ["Users", "Referrals", "Deposits", "Withdrawals", "Investments", "Transactions"] as const;
type K = (typeof KINDS)[number];
function Reports() {
  const d = useDemo(); const real = apiConfigured();
  const [k, setK] = useState<K>("Users"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const isLiveKind = real && (k === "Users" || k === "Referrals");
  const params = new URLSearchParams({ kind: k });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const apiQ = useQuery({ queryKey: ["admin-reports", k, from, to], queryFn: () => api.get<ApiAdminReport>(`/admin/reports?${params}`), enabled: isLiveKind, staleTime: 20_000 });

  const demoRecs: { date: string; amount: number; label: string }[] =
    k === "Users" ? d.users.map(u => ({ date: u.joined, amount: 1, label: u.name })) :
    k === "Referrals" ? d.users.filter(u => u.invite).map(u => ({ date: u.joined, amount: 1, label: `${u.name} via ${u.invite}` })) :
    k === "Investments" ? d.investments.map(i => ({ date: i.start, amount: i.amount, label: i.id })) :
    k === "Transactions" ? d.transactions.map(t => ({ date: t.date, amount: t.amount, label: `${t.id} ${t.type}` })) :
    d.requests.filter(r => r.kind === (k === "Deposits" ? "deposit" : "withdrawal")).map(r => ({ date: r.date, amount: r.amount, label: `${r.id} ${r.status}` }));
  const demoRows = demoRecs.filter(r => inRange(r.date, from, to));
  const demoByMonth = Object.entries(demoRows.reduce<Record<string, number>>((a, r) => { const m = r.date.slice(0, 7); a[m] = (a[m] ?? 0) + r.amount; return a; }, {})).sort().map(([m, v]) => ({ m, v }));

  const rows = isLiveKind ? (apiQ.data?.records ?? []) : demoRows;
  const byMonth = isLiveKind ? (apiQ.data?.byMonth ?? []) : demoByMonth;
  const isCount = k === "Users" || k === "Referrals";

  return <Section title={`${k} Report · ${isLiveKind ? "Live MySQL" : "Sample Data"}`} icon={FileBarChart} action={<div className="no-print flex flex-wrap gap-2"><DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} /><ExportBtn onClick={() => downloadCsv(`powerbank-${k.toLowerCase()}-report${isLiveKind ? "" : "-demo"}.csv`, rows.map(r => ({ date: fmtDate(r.date), record: r.label, value: r.amount })))} /><Button variant="outline" className="h-10 rounded-xl" onClick={() => window.print()}><Printer />Export PDF</Button></div>}>
    <Tabs value={k} onValueChange={v => setK(v as K)} className="no-print mb-4"><TabsList className="flex h-auto flex-wrap">{KINDS.map(x => <TabsTrigger key={x} value={x}>{x}</TabsTrigger>)}</TabsList></Tabs>
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-secondary p-4"><p className="text-xs">Records</p><p className="text-2xl font-extrabold">{rows.length}</p></div><div className="rounded-xl bg-secondary p-4"><p className="text-xs">{isCount ? "Count" : "Total (sample)"}</p><p className="text-2xl font-extrabold">{isCount ? rows.length : money(rows.reduce((a, r) => a + r.amount, 0))}</p></div><div className="rounded-xl bg-secondary p-4"><p className="text-xs">Months covered</p><p className="text-2xl font-extrabold">{byMonth.length}</p></div></div>
    <div className="h-72">{isLiveKind && apiQ.isLoading ? <p className="pt-20 text-center text-sm text-muted-foreground">Loading report…</p> : byMonth.length ? <ResponsiveContainer><AreaChart data={byMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip formatter={(v: number) => isLiveKind ? v : (isCount ? v : money(v)) + " (sample)"} /><Area dataKey="v" type="monotone" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} strokeWidth={3} /></AreaChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-muted-foreground">No records in this date range.</p>}</div>
    <p className="mt-3 text-xs text-muted-foreground">{isLiveKind ? "Computed directly from live MySQL records." : "Financial figures are fictional sample data for this prototype."}</p>
  </Section>;
}
