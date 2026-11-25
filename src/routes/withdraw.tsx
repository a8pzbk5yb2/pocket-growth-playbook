import { createFileRoute } from "@tanstack/react-router";
import { Landmark, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import walletImg from "@/assets/powerbank-withdraw.webp.asset.json";
import { PrimaryButton } from "@/components/pb/auth";
import { GreenHeader, MobileShell, meta } from "@/components/pb/shell";
import { inr, user, withdrawError } from "@/lib/demo-data";
export const Route = createFileRoute("/withdraw")({ head: () => meta("Withdraw Funds", "Request a withdrawal from your PowerBank balance."), component: Withdraw });
function Withdraw() {
  const [amt, setAmt] = useState("");
  return <MobileShell nav={false}><GreenHeader back title="Withdraw Funds" image={walletImg.url} /><main className="pb-money-content">
    <div className="mb-5 text-center"><p className="text-sm font-semibold">Available Balance</p><p className="text-3xl font-extrabold text-primary-deep">{inr(user.balance)}</p></div>
    <label htmlFor="withdraw-amount">Enter Amount</label><div className="pb-money-input"><input id="withdraw-amount" inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value.replace(/\D/g, ""))} placeholder="Min. ₹100" /></div>
    <div className="mt-3 grid grid-cols-4 gap-2">{[100,500,1000,5000].map(v => <Button variant="outline" key={v} onClick={() => setAmt(String(v))} className={`h-9 rounded-full px-1 text-xs font-semibold ${amt === String(v) ? "border-primary bg-secondary text-primary" : "bg-muted"}`}>{inr(v)}</Button>)}</div>
    <div className="mt-5"><label htmlFor="bank">Select Bank Account</label><div className="pb-money-input gap-2"><Landmark className="h-5 w-5 shrink-0 text-sky" /><select id="bank" className="w-full min-w-0 bg-transparent text-sm outline-none"><option>SBI •••• 4521</option><option>UPI: riyaj@okaxis</option></select></div></div>
    <div className="mt-5"><PrimaryButton onClick={() => { const err = withdrawError(Number(amt), user.balance); err ? toast.error(err) : toast.success("Withdrawal requested (demo)"); }}>Request Withdrawal</PrimaryButton></div><p className="pb-security"><ShieldCheck />Your request will be processed soon</p>
  </main></MobileShell>;
}
