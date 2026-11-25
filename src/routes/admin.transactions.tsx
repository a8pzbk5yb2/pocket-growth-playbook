import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { meta } from "@/components/pb/shell";
import { Avatar, DateRange, Demo, Detail, ExportBtn, FilterSelect, SearchBox, Section, Status, Table, Toolbar, inRange, money, usePaged } from "@/components/panel/ui";
import { downloadCsv, fmtDate, useDemo, useLookups, type DemoTx } from "@/lib/demo-store";

export const Route = createFileRoute("/admin/transactions")({ head: () => meta("Transactions", "Search and export sample PowerBank transaction records."), component: Tx });
function Tx() {
  const d = useDemo(); const L = useLookups();
  const [q, setQ] = useState(""); const [type, setType] = useState("all"); const [st, setSt] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [sel, setSel] = useState<DemoTx | null>(null);
  const rows = useMemo(() => d.transactions.filter(t => (type === "all" || t.type === type) && (st === "all" || t.status === st) && inRange(t.date, from, to) && [t.id, t.ref, L.user(t.userId)?.name ?? ""].some(x => x.toLowerCase().includes(q.toLowerCase()))), [d.transactions, q, type, st, from, to, L]);
  const { slice, pager } = usePaged(rows, 10);
  return <Section title="All Transactions" icon={ArrowLeftRight} action={<ExportBtn onClick={() => downloadCsv("powerbank-transactions-demo.csv", rows.map(t => ({ id: t.id, user: L.user(t.userId)?.name ?? "", type: t.type, amount: t.amount, reference: t.ref, status: t.status, date: fmtDate(t.date, true) })))} />}>
    <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search ID, reference or user" /><FilterSelect label="Types" value={type} onChange={setType} options={["Deposit","Withdrawal","Investment","Refund","Other"]} /><FilterSelect label="Status" value={st} onChange={setSt} options={["success","pending","failed"]} /><DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} /></Toolbar>
    <Table empty={!rows.length} head={["Transaction ID","User","Type","Amount","Reference ID","Status","Date",""]}>{slice.map(t => <tr key={t.id} className="hover:bg-muted/40"><td className="px-3 py-2.5 font-medium">{t.id}<Demo /></td><td className="px-3"><span className="flex items-center gap-2"><Avatar name={L.user(t.userId)?.name ?? "?"} size="h-7 w-7" />{L.user(t.userId)?.name}</span></td><td className="px-3">{t.type}</td><td className="px-3 font-semibold">{money(t.amount)}</td><td className="px-3 text-muted-foreground">{t.ref}</td><td className="px-3"><Status s={t.status} /></td><td className="px-3 whitespace-nowrap">{fmtDate(t.date, true)}</td><td className="px-3"><Button size="sm" variant="ghost" onClick={() => setSel(t)}><Eye />Details</Button></td></tr>)}</Table>{pager}
    {sel && <Dialog open onOpenChange={o => !o && setSel(null)}><DialogContent><DialogHeader><DialogTitle>{sel.id}</DialogTitle></DialogHeader><Detail rows={[["User", L.user(sel.userId)?.name], ["Type", sel.type], ["Amount", money(sel.amount)], ["Reference", sel.ref], ["Status", <Status key="s" s={sel.status} />], ["Date", fmtDate(sel.date, true)]]} /><p className="text-xs text-muted-foreground">Sample record — no money moved.</p></DialogContent></Dialog>}
  </Section>;
}
