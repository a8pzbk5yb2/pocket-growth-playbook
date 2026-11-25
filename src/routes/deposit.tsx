import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Landmark, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import rupeeImg from "@/assets/pb-rupee.webp.asset.json";
import { PrimaryButton } from "@/components/pb/auth";
import { GreenHeader, MobileShell, meta } from "@/components/pb/shell";

export const Route = createFileRoute("/deposit")({
  head: () => meta("Deposit Funds", "Choose a payment method to add funds to PowerBank."),
  component: Deposit,
});

const methods = [
  { id: "upi", l: "UPI", d: "Google Pay / PhonePe / Paytm", i: Smartphone },
  { id: "bank", l: "Bank Transfer", d: "NEFT / IMPS / RTGS", i: Landmark },
  { id: "card", l: "Debit / Credit Card", d: "Visa, Mastercard, RuPay", i: CreditCard },
  { id: "wallet", l: "Wallet", d: "Pay from other wallets", i: Wallet },
];

function Deposit() {
  const [m, setM] = useState("upi");
  return (
    <MobileShell nav={false}>
      <GreenHeader back title="Deposit Funds" subtitle="Select a payment method" image={rupeeImg.url} />
      <div className="space-y-3 px-5 pt-5">
        {methods.map(({ id, l, d, i: I }) => (
          <button key={id} onClick={() => setM(id)} className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left shadow-card ${m === id ? "border-primary" : "border-transparent"}`}>
            <I className="h-10 w-10 rounded-xl bg-secondary p-2 text-primary" />
            <div className="flex-1"><p className="font-bold">{l}</p><p className="text-xs text-muted-foreground">{d}</p></div>
            <span className={`h-5 w-5 rounded-full border-2 ${m === id ? "border-[6px] border-primary" : "border-border"}`} />
          </button>
        ))}
        <div className="pt-3"><PrimaryButton onClick={() => toast("Demo only — no payment is taken")}>Proceed to Pay</PrimaryButton></div>
        <p className="flex items-center justify-center gap-1 pt-2 text-xs font-semibold text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />100% Secure & Encrypted</p>
      </div>
    </MobileShell>
  );
}
