import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart, Printer } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { meta } from "@/components/pb/shell";
import { DateRange, ExportBtn, Section, inRange, money } from "@/components/panel/ui";
import { downloadCsv, fmtDate, useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/reports")({ head: () => meta("Reports", "Interactive sample reports with CSV and PDF export."), component: Reports });
const KINDS = ["Users", "Deposits", "Withdrawals", "Investments", "Transactions", "Referrals"] as const;
type K = (typeof KINDS)[number];
function Reports() {
  const d = useDemo(); const [k, setK] = useState<K>("Users"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const recs: { date: string; amount: number; label: string }[] =
    k === "Users" ? d.users.map(u => ({ date: u.joined, amount: 1, label: u.name })) :
    k === "Referrals" ? d.users.filter(u => u.invite).map(u => ({ date: u.joined, amount: 1, label: `${u.name} via ${u.invite}` })) :
    k === "Investments" ? d.investments.map(i => ({ date: i.start, amount: i.amount, label: i.id })) :
    k === "Transactions" ? d.transactions.map(t => ({ date: t.date, amount: t.amount, label: `${t.id} ${t.type}` })) :
    d.requests.filter(r => r.kind === (k === "Deposits" ? "deposit" : "withdrawal")).map(r => ({ date: r.date, amount: r.amount, label: `${r.id} ${r.status}` }));
  const rows = recs.filter(r => inRange(r.date, from, to));
  const byMonth = Object.entries(rows.reduce<Record<string, number>>((a, r) => { const m = r.date.slice(0, 7); a[m] = (a[m] ?? 0) + r.amount; return a; }, {})).sort().map(([m, v]) => ({ m, v }));
  const isCount = k === "Users" || k === "Referrals";
  return <Section title={`${k} Report · Sample Data`} icon={FileBarChart} action={<div className="no-print flex flex-wrap gap-2"><DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} /><ExportBtn onClick={() => downloadCsv(`powerbank-${k.toLowerCase()}-report-demo.csv`, rows.map(r => ({ date: fmtDate(r.date), record: r.label, value: r.amount })))} /><Button variant="outline" className="h-10 rounded-xl" onClick={() => window.print()}><Printer />Export PDF</Button></div>}>
    <Tabs value={k} onValueChange={v => setK(v as K)} className="no-print mb-4"><TabsList className="flex h-auto flex-wrap">{KINDS.map(x => <TabsTrigger key={x} value={x}>{x}</TabsTrigger>)}</TabsList></Tabs>
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-secondary p-4"><p className="text-xs">Records</p><p className="text-2xl font-extrabold">{rows.length}</p></div><div className="rounded-xl bg-secondary p-4"><p className="text-xs">{isCount ? "Count" : "Total (sample)"}</p><p className="text-2xl font-extrabold">{isCount ? rows.length : money(rows.reduce((a, r) => a + r.amount, 0))}</p></div><div className="rounded-xl bg-secondary p-4"><p className="text-xs">Months covered</p><p className="text-2xl font-extrabold">{byMonth.length}</p></div></div>
    <div className="h-72">{byMonth.length ? <ResponsiveContainer><AreaChart data={byMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip formatter={(v: number) => (isCount ? v : money(v)) + " (sample)"} /><Area dataKey="v" type="monotone" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} strokeWidth={3} /></AreaChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-muted-foreground">No sample records in this date range.</p>}</div>
    <p className="mt-3 text-xs text-muted-foreground">All figures are fictional sample data generated for this prototype.</p>
  </Section>;
}
