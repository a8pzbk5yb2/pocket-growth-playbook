import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Landmark, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import rupeeImg from "@/assets/powerbank-deposit.webp.asset.json";
import { PrimaryButton } from "@/components/pb/auth";
import { GreenHeader, MobileShell, meta } from "@/components/pb/shell";
export const Route = createFileRoute("/deposit")({ head: () => meta("Deposit Funds", "Choose a payment method to add funds to PowerBank."), component: Deposit });
const methods = [{ id: "upi", l: "UPI", d: "Google Pay / PhonePe / Paytm", i: Smartphone }, { id: "bank", l: "Bank Transfer", d: "NEFT / IMPS / RTGS", i: Landmark }, { id: "card", l: "Debit / Credit Card", d: "Visa, Mastercard, RuPay", i: CreditCard }, { id: "wallet", l: "Wallet", d: "Pay from other wallets", i: Wallet }];
function Deposit() {
  const [m, setM] = useState("upi");
  return <MobileShell nav={false}><GreenHeader back title="Deposit Funds" image={rupeeImg.url} /><main className="pb-money-content"><h2 className="mb-4 text-sm font-bold">Select Payment Method:</h2><div className="space-y-3">{methods.map(({id,l,d,i:Icon}) => <Button variant="ghost" key={id} onClick={() => setM(id)} aria-pressed={m === id} className="pb-payment-option"><Icon /><div><p>{l}</p><small>{d}</small></div><span className="pb-radio" /></Button>)}</div><div className="mt-6"><PrimaryButton onClick={() => toast("Demo only — no payment is taken")}>Proceed to Pay</PrimaryButton></div><p className="pb-security"><ShieldCheck />100% Secure & Encrypted</p></main></MobileShell>;
}
