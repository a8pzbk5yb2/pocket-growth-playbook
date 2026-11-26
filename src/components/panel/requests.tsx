import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Eye, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, Demo, Detail, ExportBtn, FilterSelect, SearchBox, Section, StatCard, Status, Table, Toolbar, money, usePaged } from "./ui";
import { api, apiConfigured, errMessage, invalidateAdminMoneyQueries, type ApiAdminDeposit, type ApiAdminDepositsPage, type ApiAdminWithdrawal, type ApiAdminWithdrawalsPage } from "@/lib/api";
import { downloadCsv, fmtDate, useDemo, useLookups } from "@/lib/demo-store";

type UnifiedReq = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: string;
  date: string;
  status: string;
  note?: string;
  gatewayOrderNo?: string | null;
  platformId?: string | null;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  ifsc?: string;
};

export function RequestsPage({ kind }: { kind: "deposit" | "withdrawal" }) {
  const d = useDemo(); const L = useLookups(); const qc = useQueryClient();
  const real = apiConfigured();
  const [q, setQ] = useState(""); const [st, setSt] = useState("all"); const [selId, setSelId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const depQ = useQuery({ queryKey: ["admin-deposits"], queryFn: () => api.get<ApiAdminDepositsPage>("/admin/deposits"), enabled: real && kind === "deposit", staleTime: 15_000 });
  const wdrQ = useQuery({ queryKey: ["admin-withdrawals"], queryFn: () => api.get<ApiAdminWithdrawalsPage>("/admin/withdrawals"), enabled: real && kind === "withdrawal", staleTime: 15_000 });

  const all: UnifiedReq[] = useMemo(() => {
    if (!real) {
      return d.requests.filter(r => r.kind === kind).map(r => ({
        id: r.id, userId: r.userId, userName: L.user(r.userId)?.name ?? "?", amount: r.amount, method: r.method, date: r.date, status: r.status, note: r.note ?? "",
      }));
    }
    if (kind === "deposit") {
      return (depQ.data?.items ?? []).map((r: ApiAdminDeposit) => ({
        id: r.id, userId: r.userId, userName: r.userName, amount: r.amount, method: r.platformId ? `MXPay · ${r.platformId}` : r.method, date: r.date, status: r.status, gatewayOrderNo: r.gatewayOrderNo, platformId: r.platformId,
      }));
    }
    return (wdrQ.data?.items ?? []).map((r: ApiAdminWithdrawal) => ({
      id: r.id, userId: r.userId, userName: r.userName, amount: r.amount, method: `${r.method} (${r.ifsc})`, date: r.date, status: r.status, note: r.note, bankName: r.bankName, accountNumber: r.accountNumber, accountName: r.accountName, ifsc: r.ifsc,
    }));
  }, [real, kind, d.requests, L, depQ.data?.items, wdrQ.data?.items]);

  const rows = useMemo(() => all.filter(r => (st === "all" || r.status === st) && [r.id, r.userId, r.userName, r.method].some(x => x.toLowerCase().includes(q.toLowerCase()))), [all, q, st]);
  const { slice, pager } = usePaged(rows);

  const decide = async (r: UnifiedReq, action: "approved" | "rejected") => {
    if (!real) { d.decide(r.id, action); toast.success(`${r.id} ${action} — demo status only, no money moved`); return; }
    if (kind !== "withdrawal") return;
    setBusyId(r.id);
    try {
      if (action === "approved") {
        await api.post(`/admin/withdrawals/${r.id}/approve`);
        toast.success(`${r.id} approved — MXPay payout initiated`);
      } else {
        await api.post(`/admin/withdrawals/${r.id}/reject`, { note: rejectNote.trim() || "Rejected by admin" });
        toast.success(`${r.id} rejected & refunded to user wallet`);
      }
      invalidateAdminMoneyQueries(qc);
      setRejectNote("");
      setSelId(null);
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusyId(null); }
  };

  const cur = selId ? all.find(r => r.id === selId) : undefined;
  const label = kind === "deposit" ? "Deposit" : "Withdrawal";
  const loading = real && (kind === "deposit" ? depQ.isLoading : wdrQ.isLoading);

  const statCards = real
    ? kind === "deposit"
      ? [
          { icon: Clock, color: "bg-warning/15 text-orange", label: "Pending Checkout", value: depQ.data?.counts.pending ?? 0 },
          { icon: CheckCircle2, color: "text-primary bg-primary/12", label: "Confirmed Deposits", value: depQ.data?.counts.success ?? 0 },
          { icon: XCircle, color: "bg-destructive/12 text-destructive", label: "Failed Deposits", value: depQ.data?.counts.failed ?? 0 },
        ]
      : [
          { icon: Clock, color: "bg-warning/15 text-orange", label: "Pending Approval", value: wdrQ.data?.counts.pending ?? 0 },
          { icon: CheckCircle2, color: "text-primary bg-primary/12", label: "Processing / Paid", value: (wdrQ.data?.counts.processing ?? 0) + (wdrQ.data?.counts.success ?? 0) },
          { icon: XCircle, color: "bg-destructive/12 text-destructive", label: "Rejected / Failed", value: (wdrQ.data?.counts.rejected ?? 0) + (wdrQ.data?.counts.failed ?? 0) },
        ]
    : [
        { icon: Clock, color: "bg-warning/15 text-orange", label: "Pending Demo Requests", value: all.filter(r => r.status === "pending").length },
        { icon: CheckCircle2, color: "text-primary bg-primary/12", label: "Approved Demo Requests", value: all.filter(r => r.status === "approved").length },
        { icon: XCircle, color: "bg-destructive/12 text-destructive", label: "Rejected Demo Requests", value: all.filter(r => r.status === "rejected").length },
      ];

  const statusOpts = real
    ? (kind === "deposit" ? ["pending", "success", "failed"] : ["pending", "processing", "success", "rejected", "failed"])
    : ["pending", "approved", "rejected"];
  const canDecide = (r: UnifiedReq) => r.status === "pending" && (!real || kind === "withdrawal");

  return <>
    <div className="grid gap-4 sm:grid-cols-3">{statCards.map(s => <StatCard key={s.label} icon={s.icon} color={s.color} label={s.label} value={s.value} />)}</div>
    <Section title={`${label} Requests`} action={<ExportBtn onClick={() => downloadCsv(`powerbank-${kind}s${real ? "" : "-demo"}.csv`, rows.map(r => ({ id: r.id, user: r.userName, amount: r.amount, method: r.method, status: r.status, date: fmtDate(r.date, true) })))} />}>
      <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search ID, user or method" /><FilterSelect label="Status" value={st} onChange={setSt} options={statusOpts} /></Toolbar>
      {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading {label.toLowerCase()}s…</p> : <>
        <Table empty={!rows.length} head={["Request ID", "User", "Amount", kind === "deposit" ? "Method / Ref" : "Bank Destination", "Date", "Status", "Actions"]}>{slice.map(r => <tr key={r.id} className="hover:bg-muted/40">
          <td className="px-3 py-2.5 font-medium">{r.id}<Demo /></td>
          <td className="px-3"><span className="flex items-center gap-2"><Avatar name={r.userName} size="h-7 w-7" />{r.userName}</span></td>
          <td className="px-3 font-semibold">{money(r.amount)}</td>
          <td className="px-3">{r.method}</td>
          <td className="px-3 whitespace-nowrap">{fmtDate(r.date, true)}</td>
          <td className="px-3"><Status s={r.status} /></td>
          <td className="px-3"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setSelId(r.id)}><Eye />View</Button>{canDecide(r) && <><Button size="sm" className="rounded-full" disabled={busyId === r.id} onClick={() => void decide(r, "approved")}>Approve</Button><Button size="sm" variant="outline" className="rounded-full border-destructive text-destructive" disabled={busyId === r.id} onClick={() => void decide(r, "rejected")}>Reject</Button></>}</div></td>
        </tr>)}</Table>{pager}
      </>}
    </Section>
    {cur && <Dialog open onOpenChange={o => !o && setSelId(null)}><DialogContent><DialogHeader><DialogTitle>{label} Request {cur.id}</DialogTitle></DialogHeader>
      <Detail rows={[
        ["User", cur.userName], ["User ID", cur.userId], ["Amount", money(cur.amount)],
        ...(kind === "withdrawal" && real ? [["Bank", `${cur.bankName ?? ""} (${cur.ifsc ?? ""})`], ["Account", `${cur.accountNumber ?? ""} · ${cur.accountName ?? ""}`]] : [["Method", cur.method]]),
        ...(cur.gatewayOrderNo ? [["MXPay Order", cur.gatewayOrderNo]] : []),
        ...(cur.platformId ? [["Platform ID", cur.platformId]] : []),
        ...(cur.note ? [["Gateway / Admin Note", cur.note]] : []),
        ["Requested", fmtDate(cur.date, true)], ["Status", <Status key="s" s={cur.status} />],
      ] as [string, React.ReactNode][]} />
      {real ? (
        kind === "deposit" ? (
          <p className="text-xs text-muted-foreground">MXPay deposits confirm automatically via signed webhook when payment succeeds.</p>
        ) : cur.status === "pending" && (
          <div className="space-y-3">
            <div><Label>Rejection reason (optional)</Label><Input value={rejectNote} maxLength={255} placeholder="Shown to user if rejected" onChange={e => setRejectNote(e.target.value)} /></div>
            <DialogFooter><Button variant="outline" className="border-destructive text-destructive" disabled={busyId === cur.id} onClick={() => void decide(cur, "rejected")}>Reject & Refund</Button><Button disabled={busyId === cur.id} onClick={() => void decide(cur, "approved")}>{busyId === cur.id ? "Sending payout…" : "Approve & Payout via MXPay"}</Button></DialogFooter>
          </div>
        )
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Prototype only: approving or rejecting changes the sample status. No payment, payout or wallet credit happens.</p>
          {cur.status === "pending" && <DialogFooter><Button variant="outline" className="border-destructive text-destructive" onClick={() => void decide(cur, "rejected")}>Reject</Button><Button onClick={() => void decide(cur, "approved")}>Approve</Button></DialogFooter>}
        </>
      )}
    </DialogContent></Dialog>}
  </>;
}
