import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Landmark, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import rupeeImg from "@/assets/powerbank-deposit.webp.asset.json";
import { PrimaryButton } from "@/components/pb/auth";
import { GreenHeader, MobileShell, meta } from "@/components/pb/shell";
import { ApiError, api, apiConfigured, errMessage, invalidateMoneyQueries, type ApiBankAccount, type ApiDeposit, type ApiTransaction, type ApiWallet } from "@/lib/api";
import { inr } from "@/lib/demo-data";

export const Route = createFileRoute("/deposit")({ head: () => meta("Deposit Funds", "Choose a payment method to add funds to PowerBank."), component: Deposit });
const methods = [{ id: "upi", l: "UPI", d: "Google Pay / PhonePe / Paytm", i: Smartphone }, { id: "bank", l: "Bank Transfer", d: "NEFT / IMPS / RTGS", i: Landmark }, { id: "card", l: "Debit / Credit Card", d: "Visa, Mastercard, RuPay", i: CreditCard }, { id: "wallet", l: "Wallet", d: "Pay from other wallets", i: Wallet }];

function Deposit() {
  const real = apiConfigured();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [m, setM] = useState("upi");
  const [amt, setAmt] = useState("500");
  const [busy, setBusy] = useState(false);
  const [payLink, setPayLink] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["me-wallet"], queryFn: () => api.get<{ wallet: ApiWallet; bankAccounts: ApiBankAccount[]; recentTransactions: ApiTransaction[] }>("/me/wallet"), enabled: real, retry: false, staleTime: 15_000 });
  const unauth = real && q.isError && q.error instanceof ApiError && q.error.status === 401;

  const submit = async () => {
    if (!real) { toast("Demo only — no payment is taken"); return; }
    const n = Number(amt);
    if (!Number.isInteger(n) || n < 100 || n > 500000) { toast.error("Enter an amount between ₹100 and ₹5,00,000"); return; }
    setBusy(true);
    try {
      const res = await api.post<{ deposit: ApiDeposit; paymentLink: string }>("/me/deposits", { amount: n });
      invalidateMoneyQueries(qc);
      setPayLink(res.paymentLink);
      window.location.assign(res.paymentLink);
    } catch (er) {
      if (er instanceof ApiError && er.status === 401) { void nav({ to: "/login" }); return; }
      toast.error(errMessage(er));
    } finally { setBusy(false); }
  };

  return <MobileShell nav={false}><GreenHeader back title="Deposit Funds" image={rupeeImg.url} /><main className="pb-money-content">
    {unauth ? (
      <div className="rounded-2xl bg-card p-6 text-center shadow-card"><p className="text-sm text-muted-foreground">Log in to deposit funds to your PowerBank wallet.</p><Button asChild className="mt-3 rounded-full"><Link to="/login">Log In</Link></Button></div>
    ) : (
      <>
        {real && <>
          <label htmlFor="deposit-amount">Enter Amount</label>
          <div className="pb-money-input"><input id="deposit-amount" inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value.replace(/\D/g, ""))} placeholder="Min. ₹100" /></div>
          <div className="mb-5 mt-3 grid grid-cols-4 gap-2">{[100, 500, 1000, 5000].map(v => <Button variant="outline" key={v} onClick={() => setAmt(String(v))} className={`h-9 rounded-full px-1 text-xs font-semibold ${amt === String(v) ? "border-primary bg-secondary text-primary" : "bg-muted"}`}>{inr(v)}</Button>)}</div>
        </>}
        <h2 className="mb-4 text-sm font-bold">{real ? "Supported Payment Options (MXPay):" : "Select Payment Method:"}</h2>
        <div className="space-y-3">{methods.map(({ id, l, d, i: Icon }) => <Button variant="ghost" key={id} onClick={() => setM(id)} aria-pressed={m === id} className="pb-payment-option"><Icon /><div><p>{l}</p><small>{d}</small></div><span className="pb-radio" /></Button>)}</div>
        <div className="mt-6"><PrimaryButton disabled={busy} onClick={() => void submit()}>{busy ? "Creating payment link…" : "Proceed to Pay"}</PrimaryButton></div>
        {payLink && <p className="mt-3 text-center text-xs">Redirect didn't start? <a href={payLink} className="font-semibold text-primary underline">Open MXPay checkout</a></p>}
        <p className="pb-security"><ShieldCheck />100% Secure & Encrypted</p>
      </>
    )}
  </main></MobileShell>;
}
