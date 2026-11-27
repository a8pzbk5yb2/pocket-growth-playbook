import { ChevronLeft, ChevronRight, Download, Search, TrendingUp, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiConfigured } from "@/lib/api";
import { inr } from "@/lib/demo-data";

export const money = (n: number) => (n === 0 ? "₹0.00" : inr(n));
export function Demo() {
  if (apiConfigured()) return null;
  return <span className="ml-1 rounded bg-warning/25 px-1 py-px align-middle text-[9px] font-bold uppercase tracking-wide text-foreground">Demo</span>;
}

const hues = ["bg-primary/15 text-primary-deep", "bg-sky/15 text-sky", "bg-violet/15 text-violet", "bg-orange/15 text-orange", "bg-rose/15 text-rose"];
export function Avatar({ name, size = "h-9 w-9" }: { name: string; size?: string }) {
  const h = hues[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];
  return <span className={`grid shrink-0 place-items-center rounded-full text-xs font-bold ${size} ${h}`}>{name.split(" ").map(p => p[0]).slice(0, 2).join("")}</span>;
}

const tone: Record<string, string> = { active: "bg-success/15 text-success", success: "bg-success/15 text-success", approved: "bg-success/15 text-success", verified: "bg-success/15 text-success", completed: "bg-sky/15 text-sky", processing: "bg-sky/15 text-sky", pending: "bg-warning/20 text-orange", inactive: "bg-muted text-muted-foreground", paused: "bg-muted text-muted-foreground", blocked: "bg-destructive/15 text-destructive", rejected: "bg-destructive/15 text-destructive", failed: "bg-destructive/15 text-destructive", read: "bg-muted text-muted-foreground", unread: "bg-primary/15 text-primary-deep" };
export function Status({ s }: { s: string }) { return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tone[s] ?? "bg-muted"}`}>{s}</span>; }

const sparkTone: Record<string, string> = { "text-primary": "var(--primary)", "text-violet": "var(--violet)", "text-sky": "var(--sky)", "text-orange": "var(--orange)", "text-rose": "var(--rose)", "text-destructive": "var(--destructive)", "text-success": "var(--success)" };
export function StatCard({ icon: Icon, label, value, trend, color = "text-primary bg-primary/12", spark }: { icon: LucideIcon; label: string; value: ReactNode; trend?: string; color?: string; spark?: number[] }) {
  const stroke = Object.entries(sparkTone).find(([k]) => color.split(" ").includes(k))?.[1] ?? "var(--primary)";
  return <div className="panel-card relative overflow-hidden p-4 transition-transform hover:-translate-y-0.5">
    <div className="flex items-start gap-3"><span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full shadow-[inset_0_-4px_10px_-4px_currentColor] ${color}`}><Icon className="h-7 w-7" strokeWidth={2.4} fill="currentColor" fillOpacity={0.22} /></span>
      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="truncate text-xl font-extrabold leading-tight 2xl:text-2xl">{value}</p></div>
      {trend && <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success"><TrendingUp className="h-3 w-3" />{trend}</span>}</div>
    {spark && <div className="-mx-4 -mb-4 mt-1 h-10"><ResponsiveContainer><AreaChart data={spark.map(v => ({ v }))}><Area dataKey="v" type="monotone" stroke={stroke} fill={stroke} fillOpacity={0.12} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>}
  </div>;
}

export function Section({ title, icon: Icon, action, children, className = "" }: { title: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel-card p-4 md:p-5 ${className}`}><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-bold">{Icon && <Icon className="h-5 w-5 text-primary" strokeWidth={2.5} fill="currentColor" fillOpacity={0.2} />}{title}</h2>{action}</div>{children}</section>;
}

export function SearchBox({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-10 rounded-xl pl-9" aria-label={placeholder} /></div>;
}
export function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} className="h-10 rounded-xl border bg-card px-3 text-sm capitalize">
    <option value="all">All {label}</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
}
export function DateRange({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return <div className="flex items-center gap-1 text-xs"><input type="date" aria-label="From date" value={from} onChange={e => onFrom(e.target.value)} className="h-10 rounded-xl border bg-card px-2" /><span>–</span><input type="date" aria-label="To date" value={to} onChange={e => onTo(e.target.value)} className="h-10 rounded-xl border bg-card px-2" /></div>;
}
export const inRange = (iso: string, from: string, to: string) => (!from || iso.slice(0, 10) >= from) && (!to || iso.slice(0, 10) <= to);
export function ExportBtn({ onClick }: { onClick: () => void }) { return <Button variant="outline" className="h-10 rounded-xl" onClick={onClick}><Download />Export CSV</Button>; }

export function usePaged<T>(rows: T[], per = 8) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const p = Math.min(page, pages);
  const slice = useMemo(() => rows.slice((p - 1) * per, p * per), [rows, p, per]);
  const real = apiConfigured();
  const pager = <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{rows.length ? `Showing ${(p - 1) * per + 1}–${Math.min(p * per, rows.length)} of ${rows.length}${real ? "" : " sample"} records` : "No records"}</span>
    <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" disabled={p <= 1} onClick={() => setPage(p - 1)} aria-label="Previous page"><ChevronLeft /></Button><span className="px-2 font-semibold text-foreground">{p} / {pages}</span><Button variant="outline" size="icon" className="h-8 w-8" disabled={p >= pages} onClick={() => setPage(p + 1)} aria-label="Next page"><ChevronRight /></Button></div></div>;
  return { slice, pager, reset: () => setPage(1) };
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-secondary/60 text-xs font-semibold text-foreground"><tr>{head.map(h => <th key={h} className="whitespace-nowrap px-3 py-3">{h}</th>)}</tr></thead>
    <tbody className="divide-y">{children}</tbody></table>{empty && <p className="p-8 text-center text-sm text-muted-foreground">{apiConfigured() ? "No records match your filters." : "No sample records match your filters."}</p>}</div>;
}
export function Toolbar({ children }: { children: ReactNode }) { return <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>; }
export function Detail({ rows }: { rows: [string, ReactNode][] }) { return <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>; }
