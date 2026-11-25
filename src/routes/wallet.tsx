import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ChevronRight, History, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import walletImg from "@/assets/powerbank-withdraw.webp.asset.json";
import { EmptyState, PageBar, MobileShell, Pills, meta } from "@/components/pb/shell";
export const Route = createFileRoute("/wallet")({ head: () => meta("Wallet", "View your PowerBank wallet balance and transactions."), component: WalletPage });
const tabs = ["All", "Deposits", "Withdrawals"] as const;
function WalletPage() {
  const [t, setT] = useState<(typeof tabs)[number]>("All");
  return <MobileShell>
    <header className="pb-green-header"><PageBar title="Wallet" /><div className="pb-balance flex items-center gap-3 !p-4"><img src={walletImg.url} alt="" className="!static !h-20 !w-24" /><div><p className="pb-balance-label">Available Balance</p><p className="pb-balance-value">₹0.00</p></div></div></header>
    <main className="pb-content"><Pills items={tabs} value={t} onChange={setT} /><EmptyState text={t === "All" ? "Add money or request withdrawal to see activity here." : `No ${t.toLowerCase()} to show`} />
      <div className="pb-menu mt-2">
        <Button variant="ghost" asChild className="pb-menu-row"><Link to="/deposit"><Plus /><span>Add Money</span><ChevronRight /></Link></Button>
        <Button variant="ghost" asChild className="pb-menu-row"><Link to="/withdraw"><ArrowDownToLine /><span>Withdraw Money</span><ChevronRight /></Link></Button>
        <Button variant="ghost" onClick={() => toast("No history yet")} className="pb-menu-row"><History /><span>Transaction History</span><ChevronRight /></Button>
      </div>
    </main>
  </MobileShell>;
}
