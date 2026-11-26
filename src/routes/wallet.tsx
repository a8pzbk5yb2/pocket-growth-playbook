import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ChevronRight, History, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import walletImg from "@/assets/powerbank-withdraw.webp.asset.json";
import { EmptyState, PageBar, MobileShell, Pills, meta } from "@/components/pb/shell";
import { Status } from "@/components/panel/ui";
import { ApiError, api, apiConfigured, invalidateMoneyQueries, type ApiBankAccount, type ApiTransaction, type ApiWallet } from "@/lib/api";
import { inr } from "@/lib/demo-data";
import { fmtDate } from "@/lib/demo-store";

export const Route = createFileRoute("/wallet")({ head: () => meta("Wallet", "View your PowerBank wallet balance and transactions."), component: WalletPage });
const tabs = ["All", "Deposits", "Withdrawals"] as const;

function WalletPage() {
  const real = apiConfigured();
  const qc = useQueryClient();
  const [t, setT] = useState<(typeof tabs)[number]>("All");
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
  const allTx = real ? (q.data?.recentTransactions ?? []) : [];
  const filtered = allTx.filter(x => t === "All" || (t === "Deposits" ? x.rawType === "deposit" : x.rawType === "withdrawal"));

  return <MobileShell>
    <header className="pb-green-header"><PageBar title="Wallet" /><div className="pb-balance flex items-center gap-3 !p-4"><img src={walletImg.url} alt="" className="!static !h-20 !w-24" /><div><p className="pb-balance-label">Available Balance</p><p className="pb-balance-value">{inr(wallet?.availableBalance ?? 0)}</p>{wallet && <p className="mt-0.5 text-[11px] text-muted-foreground">Deposit: {inr(wallet.depositBalance)} · Withdrawable: {inr(wallet.withdrawableBalance)}</p>}</div></div></header>
    <main className="pb-content">
      {returnedDeposit && <div className="mb-3 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary-deep">Checking MXPay order <b>{returnedDeposit}</b> — confirmed deposits appear below automatically.</div>}
      <Pills items={tabs} value={t} onChange={setT} />
      {unauth ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-card"><p className="text-sm text-muted-foreground">Log in to manage your PowerBank wallet.</p><Button asChild className="mt-3 rounded-full"><Link to="/login">Log In</Link></Button></div>
      ) : filtered.length ? (
        <ul className="space-y-2">{filtered.slice(0, 10).map(x => (
          <li key={x.id} className="flex items-center justify-between rounded-2xl bg-card p-3 text-sm shadow-card">
            <div className="min-w-0"><p className="truncate font-semibold">{x.type}</p><p className="text-xs text-muted-foreground">{x.ref} · {fmtDate(x.date, true)}</p></div>
            <div className="text-right"><p className={`font-bold ${x.direction === "credit" ? "text-success" : "text-foreground"}`}>{x.direction === "credit" ? "+" : "-"}{inr(x.amount)}</p><Status s={x.status} /></div>
          </li>
        ))}</ul>
      ) : <EmptyState text={t === "All" ? "Add money or request withdrawal to see activity here." : `No ${t.toLowerCase()} to show`} />}
      <div className="pb-menu mt-2">
        <Button variant="ghost" asChild className="pb-menu-row"><Link to="/deposit"><Plus /><span>Add Money</span><ChevronRight /></Link></Button>
        <Button variant="ghost" asChild className="pb-menu-row"><Link to="/withdraw"><ArrowDownToLine /><span>Withdraw Money</span><ChevronRight /></Link></Button>
        {real ? (
          <Button variant="ghost" asChild className="pb-menu-row"><Link to="/dashboard/transactions"><History /><span>Transaction History</span><ChevronRight /></Link></Button>
        ) : (
          <Button variant="ghost" onClick={() => toast("No history yet")} className="pb-menu-row"><History /><span>Transaction History</span><ChevronRight /></Button>
        )}
      </div>
    </main>
  </MobileShell>;
}
