import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import walletImg from "@/assets/pb-wallet.webp.asset.json";
import { PrimaryButton } from "@/components/pb/auth";
import { Card, GreenHeader, MobileShell, meta } from "@/components/pb/shell";
import { inr, user, withdrawError } from "@/lib/demo-data";

export const Route = createFileRoute("/withdraw")({
  head: () => meta("Withdraw Funds", "Request a withdrawal from your PowerBank balance."),
  component: Withdraw,
});

function Withdraw() {
  const [amt, setAmt] = useState("");
  return (
    <MobileShell nav={false}>
      <GreenHeader back title="Withdraw Funds" subtitle={`Available Balance ${inr(user.balance)}`} image={walletImg.url} />
      <div className="space-y-4 px-5 pt-5">
        <Card>
          <label className="text-sm font-semibold">Enter Amount</label>
          <div className="mt-2 flex items-center rounded-2xl border bg-muted px-4 py-3 focus-within:border-primary">
            <span className="mr-2 text-lg font-bold">₹</span>
            <input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} placeholder="Min. ₹100" className="flex-1 bg-transparent text-lg font-bold outline-none" />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[100, 500, 1000, 5000].map((v) => (
              <button key={v} onClick={() => setAmt(String(v))} className={`rounded-full py-2 text-xs font-bold ${amt === String(v) ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>{inr(v)}</button>
            ))}
          </div>
        </Card>
        <Card>
          <label className="text-sm font-semibold" htmlFor="bank">Bank Account</label>
          <select id="bank" className="mt-2 w-full rounded-2xl border bg-muted px-4 py-3 text-sm outline-none">
            <option>SBI •••• 4521</option><option>UPI: riyaj@okaxis</option>
          </select>
        </Card>
        <PrimaryButton onClick={() => {
          const err = withdrawError(Number(amt), user.balance);
          err ? toast.error(err) : toast.success("Withdrawal requested (demo)");
        }}>Request Withdrawal</PrimaryButton>
      </div>
    </MobileShell>
  );
}
