import { useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, errMessage, invalidateMoneyQueries, type ApiBankAccount } from "@/lib/api";

export function AddBankDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded?: (b: ApiBankAccount) => void }) {
  const qc = useQueryClient();
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bn = bankName.trim();
    const an = accountName.trim();
    const num = accountNumber.replace(/\D/g, "");
    const code = ifsc.trim().toUpperCase();
    if (bn.length < 2) { setErr("Enter a valid bank name"); return; }
    if (an.length < 2) { setErr("Enter account holder name"); return; }
    if (!/^[0-9]{6,34}$/.test(num)) { setErr("Enter a valid bank account number (6–34 digits)"); return; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) { setErr("Enter a valid 11-character IFSC code (e.g. SBIN0001234)"); return; }
    setErr(""); setBusy(true);
    try {
      const res = await api.post<{ bankAccount: ApiBankAccount }>("/me/bank-accounts", {
        bankName: bn, accountName: an, accountNumber: num, ifsc: code,
      });
      invalidateMoneyQueries(qc);
      toast.success("Bank account added");
      setBankName(""); setAccountName(""); setAccountNumber(""); setIfsc("");
      onAdded?.(res.bankAccount);
      onOpenChange(false);
    } catch (er) {
      const firstField = er instanceof ApiError ? Object.values(er.fields)[0] : undefined;
      setErr(firstField ?? errMessage(er));
    } finally { setBusy(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
    <form className="space-y-3" onSubmit={e => void submit(e)}>
      <div><Label>Bank Name</Label><Input value={bankName} maxLength={120} placeholder="e.g. State Bank of India" onChange={e => setBankName(e.target.value)} /></div>
      <div><Label>Account Holder Name</Label><Input value={accountName} maxLength={100} placeholder="As per bank passbook" onChange={e => setAccountName(e.target.value)} /></div>
      <div><Label>Account Number</Label><Input inputMode="numeric" value={accountNumber} maxLength={34} placeholder="Digits only" onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ""))} /></div>
      <div><Label>IFSC Code</Label><Input value={ifsc} maxLength={11} placeholder="e.g. SBIN0001234" onChange={e => setIfsc(e.target.value.toUpperCase())} /></div>
      {err && <p className="text-xs font-medium text-destructive">{err}</p>}
      <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save Bank Account"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

export function BankAccountsManager({ accounts }: { accounts: ApiBankAccount[] }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await api.del(`/me/bank-accounts/${id}`);
      invalidateMoneyQueries(qc);
      toast.success("Bank account removed");
    } catch (er) { toast.error(errMessage(er)); }
    finally { setDeleting(null); }
  };

  return <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">Used for real-money bank withdrawals.</p>
      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add Bank</Button>
    </div>
    {accounts.length ? <ul className="space-y-2">{accounts.map(b => <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Landmark className="h-5 w-5 shrink-0 text-sky" />
        <div className="min-w-0"><p className="truncate font-semibold">{b.bankName} · {b.accountNumber}</p><p className="truncate text-xs text-muted-foreground">{b.accountName} · IFSC {b.ifsc}{b.isDefault ? " · Default" : ""}</p></div>
      </div>
      <Button size="icon" variant="ghost" aria-label="Remove bank account" disabled={deleting === b.id} onClick={() => void remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </li>)}</ul> : <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">No bank account added yet. Add one to withdraw funds.</p>}
    <AddBankDialog open={addOpen} onOpenChange={setAddOpen} />
  </div>;
}

