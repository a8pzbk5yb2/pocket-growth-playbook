import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section, Status, Table, money, usePaged } from "./ui";
import { MIN_WITHDRAW, withdrawError } from "@/lib/demo-data";
import { fmtDate } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";
export function MyRequests({ kind }: { kind: "deposit" | "withdrawal" }) {
  const { d, me } = useMe(); const rows = d.requests.filter(r => r.kind === kind && r.userId === me.id); const { slice, pager } = usePaged(rows);
  const [open, setOpen] = useState(false); const [amt, setAmt] = useState(""); const [method, setMethod] = useState(kind === "deposit" ? "UPI" : "Bank •••• 4521");
  const submit = () => { const n = Number(amt);
    const err = kind === "withdrawal" ? withdrawError(n, me.balance) : !n || n < 100 ? `Minimum is ${money(MIN_WITHDRAW)}` : null;
    if (err) { toast.error(err); return; } d.createRequest({ kind, userId: me.id, amount: n, method }); toast.success("Demo request submitted for admin review"); setOpen(false); setAmt(""); };
  return <Section title={kind === "deposit" ? "Deposit History" : "Withdrawal History"} action={<Button className="rounded-xl" onClick={() => setOpen(true)}><Plus />New demo request</Button>}>
    <Table empty={!rows.length} head={["Request ID","Amount",kind === "deposit" ? "Method" : "Destination","Date","Status"]}>{slice.map(r => <tr key={r.id}><td className="px-3 py-2.5">{r.id}</td><td className="px-3 font-semibold">{money(r.amount)}</td><td className="px-3">{r.method}</td><td className="px-3">{fmtDate(r.date, true)}</td><td className="px-3"><Status s={r.status} /></td></tr>)}</Table>{pager}
    {open && <Dialog open onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>New demo {kind} request</DialogTitle></DialogHeader>
      <div className="space-y-3"><div><Label>Amount (₹, min 100)</Label><Input inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value.replace(/\D/g, ""))} /></div>
        <div><Label>{kind === "deposit" ? "Method" : "Destination (sample)"}</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={method} onChange={e => setMethod(e.target.value)}>{(kind === "deposit" ? ["UPI","Bank Transfer","Card","Wallet"] : ["Bank •••• 4521","UPI demo@okaxis"]).map(m => <option key={m}>{m}</option>)}</select></div>
        <p className="text-xs text-muted-foreground">Nothing is charged or paid out. No bank details are collected.</p></div>
      <DialogFooter><Button onClick={submit}>Submit request</Button></DialogFooter></DialogContent></Dialog>}
  </Section>;
}
