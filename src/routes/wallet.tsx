import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ChevronRight, History, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import walletImg from "@/assets/pb-wallet.webp.asset.json";
import { Card, EmptyState, GreenHeader, MobileShell, Pills, meta } from "@/components/pb/shell";

export const Route = createFileRoute("/wallet")({
  head: () => meta("Wallet", "View your PowerBank wallet balance and transactions."),
  component: WalletPage,
});

const tabs = ["All", "Deposits", "Withdrawals"] as const;

function WalletPage() {
  const [t, setT] = useState<(typeof tabs)[number]>("All");
  const row = "flex items-center gap-3 py-3";
  return (
    <MobileShell>
      <GreenHeader title="₹0.00" subtitle="Wallet Balance" image={walletImg.url} />
      <div className="space-y-4 px-5 pt-5">
        <Card className="divide-y py-1">
          <Link to="/deposit" className={row}><Plus className="h-9 w-9 rounded-xl bg-secondary p-2 text-primary" /><span className="flex-1 font-semibold">Add Money</span><ChevronRight className="h-5 w-5 text-muted-foreground" /></Link>
          <Link to="/withdraw" className={row}><ArrowDownToLine className="h-9 w-9 rounded-xl bg-secondary p-2 text-primary" /><span className="flex-1 font-semibold">Withdraw Money</span><ChevronRight className="h-5 w-5 text-muted-foreground" /></Link>
          <button onClick={() => toast("No history yet")} className={`${row} w-full text-left`}><History className="h-9 w-9 rounded-xl bg-secondary p-2 text-primary" /><span className="flex-1 font-semibold">Transaction History</span><ChevronRight className="h-5 w-5 text-muted-foreground" /></button>
        </Card>
        <Pills items={tabs} value={t} onChange={setT} />
        <Card><EmptyState text={`No ${t === "All" ? "transactions" : t.toLowerCase()} to show`} /></Card>
      </div>
    </MobileShell>
  );
}
