import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { meta } from "@/components/pb/shell";
import { Avatar, DateRange, Demo, Detail, ExportBtn, FilterSelect, SearchBox, Section, Status, Table, Toolbar, inRange, money, usePaged } from "@/components/panel/ui";
import { api, apiConfigured, type ApiAdminTx } from "@/lib/api";
import { downloadCsv, fmtDate, useDemo, useLookups } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/transactions")({ head: () => meta("Transactions", "Search and export PowerBank transaction records."), component: Tx });
const REAL_TYPES = ["Deposit", "Withdrawal", "Investment", "Daily Earning", "Task Reward", "Referral Bonus", "Refund", "Adjustment"];
const DEMO_TYPES = ["Deposit", "Withdrawal", "Investment", "Refund", "Other"];

type RowTx = { id: string; userName: string; type: string; amount: number; ref: string; status: string; date: string; direction?: string; note?: string | null };

function Tx() {
  const d = useDemo(); const L = useLookups();
  const real = apiConfigured();
  const [q, setQ] = useState(""); const [type, setType] = useState("all"); const [st, setSt] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [sel, setSel] = useState<RowTx | null>(null);

  const apiQ = useQuery({ queryKey: ["admin-transactions"], queryFn: () => api.get<{ items: ApiAdminTx[] }>("/admin/transactions"), enabled: real, staleTime: 15_000 });

  const all: RowTx[] = useMemo(() => real
    ? (apiQ.data?.items ?? []).map(t => ({ id: t.id, userName: t.userName, type: t.type, amount: t.amount, ref: t.ref, status: t.status, date: t.date, direction: t.direction, note: t.note }))
    : d.transactions.map(t => ({ id: t.id, userName: L.user(t.userId)?.name ?? "?", type: t.type, amount: t.amount, ref: t.ref, status: t.status, date: t.date })), [real, apiQ.data?.items, d.transactions, L]);

  const rows = useMemo(() => all.filter(t => (type === "all" || t.type === type) && (st === "all" || t.status === st) && inRange(t.date, from, to) && [t.id, t.ref, t.userName].some(x => x.toLowerCase().includes(q.toLowerCase()))), [all, q, type, st, from, to]);
  const { slice, pager } = usePaged(rows, 10);

  return <Section title="All Transactions" icon={ArrowLeftRight} action={<ExportBtn onClick={() => downloadCsv(`powerbank-transactions${real ? "" : "-demo"}.csv`, rows.map(t => ({ id: t.id, user: t.userName, type: t.type, amount: t.amount, reference: t.ref, status: t.status, date: fmtDate(t.date, true) })))} />}>
    <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search ID, reference or user" /><FilterSelect label="Types" value={type} onChange={setType} options={real ? REAL_TYPES : DEMO_TYPES} /><FilterSelect label="Status" value={st} onChange={setSt} options={["success", "pending", "failed"]} /><DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} /></Toolbar>
    {real && apiQ.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading transactions…</p> : <>
      <Table empty={!rows.length} head={["Transaction ID", "User", "Type", "Amount", "Reference ID", "Status", "Date", ""]}>{slice.map(t => <tr key={t.id} className="hover:bg-muted/40"><td className="px-3 py-2.5 font-medium">{t.id}<Demo /></td><td className="px-3"><span className="flex items-center gap-2"><Avatar name={t.userName} size="h-7 w-7" />{t.userName}</span></td><td className="px-3">{t.type}</td><td className="px-3 font-semibold">{t.direction ? (t.direction === "credit" ? "+" : "-") : ""}{money(t.amount)}</td><td className="px-3 text-muted-foreground">{t.ref}</td><td className="px-3"><Status s={t.status} /></td><td className="px-3 whitespace-nowrap">{fmtDate(t.date, true)}</td><td className="px-3"><Button size="sm" variant="ghost" onClick={() => setSel(t)}><Eye />Details</Button></td></tr>)}</Table>{pager}
    </>}
    {sel && <Dialog open onOpenChange={o => !o && setSel(null)}><DialogContent><DialogHeader><DialogTitle>{sel.id}</DialogTitle></DialogHeader><Detail rows={[["User", sel.userName], ["Type", sel.type], ["Amount", `${sel.direction ? (sel.direction === "credit" ? "+" : "-") : ""}${money(sel.amount)}`], ["Reference", sel.ref], ["Status", <Status key="s" s={sel.status} />], ["Date", fmtDate(sel.date, true)], ...(sel.note ? [["Note", sel.note] as [string, string]] : [])]} />{!real && <p className="text-xs text-muted-foreground">Sample record — no money moved.</p>}</DialogContent></Dialog>}
  </Section>;
}
