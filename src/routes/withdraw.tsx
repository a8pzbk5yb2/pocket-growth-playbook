import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import walletImg from "@/assets/powerbank-withdraw.webp.asset.json";
import { PrimaryButton } from "@/components/pb/auth";
import { GreenHeader, MobileShell, meta } from "@/components/pb/shell";
import { AddBankDialog } from "@/components/panel/bank-accounts";
import { ApiError, api, apiConfigured, errMessage, invalidateMoneyQueries, type ApiBankAccount, type ApiTransaction, type ApiWallet, type ApiWithdrawal } from "@/lib/api";
import { inr, user, withdrawError } from "@/lib/demo-data";

export const Route = createFileRoute("/withdraw")({ head: () => meta("Withdraw Funds", "Request a withdrawal from your PowerBank balance."), component: Withdraw });
function Withdraw() {
  const real = apiConfigured();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [amt, setAmt] = useState("");
  const [bankId, setBankId] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ["me-wallet"], queryFn: () => api.get<{ wallet: ApiWallet; bankAccounts: ApiBankAccount[]; recentTransactions: ApiTransaction[] }>("/me/wallet"), enabled: real, retry: false, staleTime: 15_000 });
  const unauth = real && q.isError && q.error instanceof ApiError && q.error.status === 401;
  const accounts = useMemo(() => q.data?.bankAccounts ?? [], [q.data?.bankAccounts]);
  const wdrBal = real ? (q.data?.wallet.withdrawableBalance ?? 0) : user.balance;
  const depBal = real ? (q.data?.wallet.depositBalance ?? 0) : 0;

  useEffect(() => {
    if (accounts.length && !accounts.some(a => a.id === bankId)) {
      setBankId((accounts.find(a => a.isDefault) ?? accounts[0])!.id);
    }
  }, [accounts, bankId]);

  const submit = async () => {
    const n = Number(amt);
    if (!real) {
      const err = withdrawError(n, user.balance);
      if (err) toast.error(err); else toast.success("Withdrawal requested (demo)");
      return;
    }
    const err = withdrawError(n, wdrBal);
    if (err) { toast.error(err); return; }
    if (!bankId) { toast.error("Add and select a bank account first"); setBankOpen(true); return; }
    setBusy(true);
    try {
      await api.post<{ withdrawal: ApiWithdrawal }>("/me/withdrawals", { amount: n, bankAccountId: Number(bankId) });
      invalidateMoneyQueries(qc);
      setAmt("");
      toast.success("Withdrawal submitted for admin review");
    } catch (er) {
      if (er instanceof ApiError && er.status === 401) { void nav({ to: "/login" }); return; }
      toast.error(errMessage(er));
    } finally { setBusy(false); }
  };

  return <MobileShell nav={false}><GreenHeader back title="Withdraw Funds" image={walletImg.url} /><main className="pb-money-content">
    {unauth ? (
      <div className="rounded-2xl bg-card p-6 text-center shadow-card"><p className="text-sm text-muted-foreground">Log in to request a withdrawal.</p><Button asChild className="mt-3 rounded-full"><Link to="/login">Log In</Link></Button></div>
    ) : (
      <>
        <div className="mb-5 text-center"><p className="text-sm font-semibold">{real ? "Withdrawable Earnings Balance" : "Available Balance"}</p><p className="text-3xl font-extrabold text-primary-deep">{inr(wdrBal)}</p>{real && depBal > 0 && <p className="mt-1 text-xs text-muted-foreground">Deposit wallet ({inr(depBal)}) can be invested in plans; earnings & bonuses are withdrawable.</p>}</div>
        <label htmlFor="withdraw-amount">Enter Amount</label><div className="pb-money-input"><input id="withdraw-amount" inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value.replace(/\D/g, ""))} placeholder="Min. ₹100" /></div>
        <div className="mt-3 grid grid-cols-4 gap-2">{[100, 500, 1000, 5000].map(v => <Button variant="outline" key={v} onClick={() => setAmt(String(v))} className={`h-9 rounded-full px-1 text-xs font-semibold ${amt === String(v) ? "border-primary bg-secondary text-primary" : "bg-muted"}`}>{inr(v)}</Button>)}</div>
        <div className="mt-5">
          <div className="flex items-center justify-between"><label htmlFor="bank">Select Bank Account</label>{real && <button type="button" onClick={() => setBankOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" />Add Bank</button>}</div>
          <div className="pb-money-input gap-2"><Landmark className="h-5 w-5 shrink-0 text-sky" />
            {real ? (
              accounts.length ? (
                <select id="bank" value={bankId} onChange={e => setBankId(e.target.value)} className="w-full min-w-0 bg-transparent text-sm outline-none">{accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} {a.accountNumber} ({a.ifsc})</option>)}</select>
              ) : (
                <button type="button" onClick={() => setBankOpen(true)} className="w-full text-left text-sm text-primary">No bank added — tap to add bank account</button>
              )
            ) : (
              <select id="bank" className="w-full min-w-0 bg-transparent text-sm outline-none"><option>SBI •••• 4521</option><option>UPI: riyaj@okaxis</option></select>
            )}
          </div>
        </div>
        <div className="mt-5"><PrimaryButton disabled={busy} onClick={() => void submit()}>{busy ? "Submitting…" : "Request Withdrawal"}</PrimaryButton></div><p className="pb-security"><ShieldCheck />Your request will be processed after approval</p>
        {real && <AddBankDialog open={bankOpen} onOpenChange={setBankOpen} onAdded={b => setBankId(b.id)} />}
      </>
    )}
  </main></MobileShell>;
}
