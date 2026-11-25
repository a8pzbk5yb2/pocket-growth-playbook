import { CheckCircle2, Clock, Eye, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, Demo, Detail, ExportBtn, FilterSelect, SearchBox, Section, StatCard, Status, Table, Toolbar, money, usePaged } from "./ui";
import { downloadCsv, fmtDate, useDemo, useLookups, type DemoRequest } from "@/lib/demo-store";

export function RequestsPage({ kind }: { kind: "deposit" | "withdrawal" }) {
  const d = useDemo(); const L = useLookups();
  const [q, setQ] = useState(""); const [st, setSt] = useState("all"); const [sel, setSel] = useState<string | null>(null);
  const all = d.requests.filter(r => r.kind === kind);
  const rows = useMemo(() => all.filter(r => (st === "all" || r.status === st) && [r.id, L.user(r.userId)?.name ?? "", r.method].some(x => x.toLowerCase().includes(q.toLowerCase()))), [all, q, st, L]);
  const { slice, pager } = usePaged(rows);
  const c = (s: string) => all.filter(r => r.status === s).length;
  const decide = (r: DemoRequest, s: "approved" | "rejected") => { d.decide(r.id, s); toast.success(`${r.id} ${s} — demo status only, no money moved`); };
  const cur = sel ? d.requests.find(r => r.id === sel) : undefined;
  const label = kind === "deposit" ? "Deposit" : "Withdrawal";
  return <>
    <div className="grid gap-4 sm:grid-cols-3"><StatCard icon={Clock} color="bg-warning/15 text-orange" label="Pending Demo Requests" value={c("pending")} /><StatCard icon={CheckCircle2} label="Approved Demo Requests" value={c("approved")} /><StatCard icon={XCircle} color="bg-destructive/12 text-destructive" label="Rejected Demo Requests" value={c("rejected")} /></div>
    <Section title={`${label} Requests`} action={<ExportBtn onClick={() => downloadCsv(`powerbank-${kind}s-demo.csv`, rows.map(r => ({ id: r.id, user: L.user(r.userId)?.name ?? "", amount: r.amount, method: r.method, status: r.status, date: fmtDate(r.date, true) })))} />}>
      <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search ID, user or method" /><FilterSelect label="Status" value={st} onChange={setSt} options={["pending","approved","rejected"]} /></Toolbar>
      <Table empty={!rows.length} head={["Request ID","User","Amount",kind === "deposit" ? "Method" : "Destination (masked)","Date","Status","Actions"]}>{slice.map(r => <tr key={r.id} className="hover:bg-muted/40"><td className="px-3 py-2.5 font-medium">{r.id}<Demo /></td><td className="px-3"><span className="flex items-center gap-2"><Avatar name={L.user(r.userId)?.name ?? "?"} size="h-7 w-7" />{L.user(r.userId)?.name}</span></td><td className="px-3 font-semibold">{money(r.amount)}</td><td className="px-3">{r.method}</td><td className="px-3 whitespace-nowrap">{fmtDate(r.date, true)}</td><td className="px-3"><Status s={r.status} /></td>
        <td className="px-3"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setSel(r.id)}><Eye />View</Button>{r.status === "pending" && <><Button size="sm" className="rounded-full" onClick={() => decide(r, "approved")}>Approve</Button><Button size="sm" variant="outline" className="rounded-full border-destructive text-destructive" onClick={() => decide(r, "rejected")}>Reject</Button></>}</div></td></tr>)}</Table>{pager}
    </Section>
    {cur && <Dialog open onOpenChange={o => !o && setSel(null)}><DialogContent><DialogHeader><DialogTitle>{label} Request {cur.id}</DialogTitle></DialogHeader>
      <Detail rows={[["User", L.user(cur.userId)?.name], ["User ID", cur.userId], ["Amount", money(cur.amount)], [kind === "deposit" ? "Method" : "Destination", cur.method], ["Requested", fmtDate(cur.date, true)], ["Status", <Status key="s" s={cur.status} />]]} />
      <p className="text-xs text-muted-foreground">Prototype only: approving or rejecting changes the sample status. No payment, payout or wallet credit happens.</p>
      {cur.status === "pending" && <DialogFooter><Button variant="outline" className="border-destructive text-destructive" onClick={() => decide(cur, "rejected")}>Reject</Button><Button onClick={() => decide(cur, "approved")}>Approve</Button></DialogFooter>}
    </DialogContent></Dialog>}
  </>;
}
