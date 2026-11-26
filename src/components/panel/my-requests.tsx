import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddBankDialog } from "./bank-accounts";
import { Section, Status, Table, money, usePaged } from "./ui";
import { api, apiConfigured, errMessage, invalidateMoneyQueries, type ApiBankAccount, type ApiDeposit, type ApiTransaction, type ApiWallet, type ApiWithdrawal } from "@/lib/api";
import { MIN_WITHDRAW, withdrawError } from "@/lib/demo-data";
import { fmtDate } from "@/lib/demo-store";
import { useMe } from "@/lib/use-me";

export function MyRequests({ kind }: { kind: "deposit" | "withdrawal" }) {
  const { d, me } = useMe();
  const qc = useQueryClient();
  const real = apiConfigured();

  const depQ = useQuery({ queryKey: ["me-deposits"], queryFn: () => api.get<{ deposits: ApiDeposit[] }>("/me/deposits"), enabled: real && kind === "deposit", staleTime: 15_000 });
  const wdrQ = useQuery({ queryKey: ["me-withdrawals"], queryFn: () => api.get<{ withdrawals: ApiWithdrawal[] }>("/me/withdrawals"), enabled: real && kind === "withdrawal", staleTime: 15_000 });
  const walletQ = useQuery({ queryKey: ["me-wallet"], queryFn: () => api.get<{ wallet: ApiWallet; bankAccounts: ApiBankAccount[]; recentTransactions: ApiTransaction[] }>("/me/wallet"), enabled: real && kind === "withdrawal", staleTime: 15_000 });

  type RowReq = { id: string; amount: number; method: string; date: string; status: string };
  const demoRows: RowReq[] = d.requests.filter(r => r.kind === kind && r.userId === me.id).map(r => ({ id: r.id, amount: r.amount, method: r.method, date: r.date, status: r.status }));
  const realRows: RowReq[] = kind === "deposit" ? (depQ.data?.deposits ?? []) : (wdrQ.data?.withdrawals ?? []);
  const rows: RowReq[] = real ? realRows : demoRows;
  const { slice, pager } = usePaged(rows);

  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [method, setMethod] = useState(kind === "deposit" ? "UPI" : "Bank •••• 4521");
  const [bankId, setBankId] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const accounts = useMemo(() => walletQ.data?.bankAccounts ?? [], [walletQ.data?.bankAccounts]);
  const wdrBal = walletQ.data?.wallet.withdrawableBalance ?? 0;

  useEffect(() => {
    if (accounts.length && !accounts.some(a => a.id === bankId)) {
      setBankId((accounts.find(a => a.isDefault) ?? accounts[0])!.id);
    }
  }, [accounts, bankId]);

  const submit = async () => {
    const n = Number(amt);
    if (!real) {
      const err = kind === "withdrawal" ? withdrawError(n, me.balance) : !n || n < 100 ? `Minimum is ${money(MIN_WITHDRAW)}` : null;
      if (err) { toast.error(err); return; }
      d.createRequest({ kind, userId: me.id, amount: n, method });
      toast.success("Demo request submitted for admin review");
      setOpen(false); setAmt("");
      return;
    }

    if (kind === "deposit") {
      if (!Number.isInteger(n) || n < 100 || n > 500000) { toast.error("Enter an amount between ₹100 and ₹5,00,000"); return; }
      setBusy(true);
      try {
        const r = await api.post<{ deposit: ApiDeposit; paymentLink: string }>("/me/deposits", { amount: n });
        invalidateMoneyQueries(qc);
        setOpen(false); setAmt("");
        window.location.assign(r.paymentLink);
      } catch (er) { toast.error(errMessage(er)); }
      finally { setBusy(false); }
      return;
    }

    const err = withdrawError(n, wdrBal);
    if (err) { toast.error(err); return; }
    if (!bankId) { toast.error("Add and select a bank account"); setBankOpen(true); return; }
    setBusy(true);
    try {
      await api.post<{ withdrawal: ApiWithdrawal }>("/me/withdrawals", { amount: n, bankAccountId: Number(bankId) });
      invalidateMoneyQueries(qc);
      toast.success("Withdrawal request submitted for admin review");
      setOpen(false); setAmt("");
    } catch (er) { toast.error(errMessage(er)); }
    finally { setBusy(false); }
  };

  const loading = real && (kind === "deposit" ? depQ.isLoading : wdrQ.isLoading);

  return <Section title={kind === "deposit" ? "Deposit History" : "Withdrawal History"} action={<Button className="rounded-xl" onClick={() => setOpen(true)}><Plus />{real ? (kind === "deposit" ? "New Deposit" : "Request Withdrawal") : "New demo request"}</Button>}>
    {loading && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
    {!loading && <><Table empty={!rows.length} head={["Request ID", "Amount", kind === "deposit" ? "Method" : "Destination", "Date", "Status"]}>{slice.map(r => <tr key={r.id}><td className="px-3 py-2.5">{r.id}</td><td className="px-3 font-semibold">{money(r.amount)}</td><td className="px-3">{r.method}</td><td className="px-3">{fmtDate(r.date, true)}</td><td className="px-3"><Status s={r.status} /></td></tr>)}</Table>{pager}</>}
    {open && <Dialog open onOpenChange={() => !busy && setOpen(false)}><DialogContent><DialogHeader><DialogTitle>{real ? (kind === "deposit" ? "Deposit via MXPay" : "Request Withdrawal") : `New demo ${kind} request`}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        {real && kind === "withdrawal" && <p className="rounded-xl bg-secondary px-3 py-2 text-xs">Withdrawable balance: <b>{money(wdrBal)}</b></p>}
        <div><Label>Amount (₹, min 100)</Label><Input inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value.replace(/\D/g, ""))} /></div>
        {real ? (
          kind === "deposit" ? (
            <p className="text-xs text-muted-foreground">You will be redirected to MXPay checkout (UPI, QR, Cards, NetBanking) and returned automatically.</p>
          ) : (
            <div>
              <div className="mb-1 flex items-center justify-between"><Label>Bank Account</Label><button type="button" className="text-xs font-semibold text-primary" onClick={() => setBankOpen(true)}>+ Add Bank</button></div>
              {accounts.length ? (
                <select className="h-10 w-full rounded-md border bg-card px-3 text-sm" value={bankId} onChange={e => setBankId(e.target.value)}>{accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} {a.accountNumber} ({a.ifsc})</option>)}</select>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={() => setBankOpen(true)}>Add a Bank Account</Button>
              )}
            </div>
          )
        ) : (
          <>
            <div><Label>{kind === "deposit" ? "Method" : "Destination (sample)"}</Label><select className="h-10 w-full rounded-md border bg-card px-3" value={method} onChange={e => setMethod(e.target.value)}>{(kind === "deposit" ? ["UPI", "Bank Transfer", "Card", "Wallet"] : ["Bank •••• 4521", "UPI demo@okaxis"]).map(m => <option key={m}>{m}</option>)}</select></div>
            <p className="text-xs text-muted-foreground">Nothing is charged or paid out. No bank details are collected.</p>
          </>
        )}
      </div>
      <DialogFooter><Button disabled={busy} onClick={() => void submit()}>{busy ? "Please wait…" : real && kind === "deposit" ? "Proceed to Pay" : "Submit request"}</Button></DialogFooter></DialogContent></Dialog>}
    {real && kind === "withdrawal" && <AddBankDialog open={bankOpen} onOpenChange={setBankOpen} onAdded={b => setBankId(b.id)} />}
  </Section>;
}
