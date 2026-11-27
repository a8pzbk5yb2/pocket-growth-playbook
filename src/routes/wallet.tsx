import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ChevronRight, History, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import walletImg from "@/assets/powerbank-withdraw.webp.asset.json";
import { PageBar, MobileShell, meta } from "@/components/pb/shell";
import { ApiError, api, apiConfigured, invalidateMoneyQueries, type ApiBankAccount, type ApiWallet } from "@/lib/api";
import { inr } from "@/lib/demo-data";

export const Route = createFileRoute("/wallet")({ head: () => meta("Wallet", "View your PowerBank wallet balance and transactions."), component: WalletPage });

function WalletPage() {
  const real = apiConfigured();
  const qc = useQueryClient();
  const [returnedDeposit, setReturnedDeposit] = useState<string | null>(null);

  useEffect(() => {
    if (!real || typeof window === "undefined") return;
    const dep = new URLSearchParams(window.location.search).get("deposit");
    if (dep) {
      setReturnedDeposit(dep);
      invalidateMoneyQueries(qc);
    }
  }, [real, qc]);

  const q = useQuery({
    queryKey: ["me-wallet"],
    queryFn: () => api.get<{ wallet: ApiWallet; bankAccounts: ApiBankAccount[]; recentTransactions: ApiTransaction[] }>("/me/wallet"),
    enabled: real,
    retry: false,
    staleTime: 15_000,
  });
  const unauth = real && q.isError && q.error instanceof ApiError && q.error.status === 401;
  const wallet = q.data?.wallet;

  return <MobileShell>
    <header className="pb-green-header"><PageBar title="Wallet" /><div className="pb-balance flex items-center gap-3 !p-4"><img src={walletImg.url} alt="" className="!static !h-20 !w-24" /><div><p className="pb-balance-label">Available Balance</p><p className="pb-balance-value">{inr(wallet?.availableBalance ?? 0)}</p>{wallet && <p className="mt-0.5 text-[11px] text-muted-foreground">Deposit: {inr(wallet.depositBalance)} · Withdrawable: {inr(wallet.withdrawableBalance)}</p>}</div></div></header>
    <main className="pb-content">
      {returnedDeposit && <div className="mb-3 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary-deep">Checking MXPay order <b>{returnedDeposit}</b> — confirmed deposits appear in Transaction History.</div>}
      {unauth && (
        <div className="mb-3 rounded-2xl bg-card p-6 text-center shadow-card"><p className="text-sm text-muted-foreground">Log in to manage your PowerBank wallet.</p><Button asChild className="mt-3 rounded-full"><Link to="/login">Log In</Link></Button></div>
      )}
      <div className="pb-menu mt-2">
        <Button variant="ghost" asChild className="pb-menu-row"><Link to="/deposit"><Plus /><span>Add Money</span><ChevronRight /></Link></Button>
        <Button variant="ghost" asChild className="pb-menu-row"><Link to="/withdraw"><ArrowDownToLine /><span>Withdraw Money</span><ChevronRight /></Link></Button>
        {real ? (
          <Button variant="ghost" asChild className="pb-menu-row"><Link to="/history"><History /><span>Transaction History</span><ChevronRight /></Link></Button>
        ) : (
          <Button variant="ghost" onClick={() => toast("No history yet")} className="pb-menu-row"><History /><span>Transaction History</span><ChevronRight /></Button>
        )}
      </div>
    </main>
  </MobileShell>;
}
