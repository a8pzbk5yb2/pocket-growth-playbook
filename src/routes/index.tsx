import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import walletImg from "@/assets/powerbank-home.webp.asset.json";
import { EmptyState, Logo, MobileShell, meta } from "@/components/pb/shell";
import { Status } from "@/components/panel/ui";
import { ApiError, api, apiConfigured, type ApiDashboard } from "@/lib/api";
import { inr, user } from "@/lib/demo-data";
import { fmtDate } from "@/lib/demo-store";

export const Route = createFileRoute("/")({ head: () => meta("Home", "Your PowerBank balance, earnings and quick actions."), component: Home });
function Home() {
  const real = apiConfigured();
  const q = useQuery({ queryKey: ["me-dashboard"], queryFn: () => api.get<ApiDashboard>("/me/dashboard"), enabled: real, retry: false, staleTime: 30_000 });
  const guest = real && q.isError && q.error instanceof ApiError && q.error.status === 401;
  const dash = real ? q.data : undefined;

  const displayName = real ? (dash?.user.name ?? (guest ? "Guest" : "Member")) : user.name;
  const avail = real ? (dash?.wallet.availableBalance ?? 0) : user.balance;
  const wdr = real ? (dash?.wallet.withdrawableBalance ?? 0) : user.earnings;
  const dep = real ? (dash?.wallet.depositBalance ?? 0) : user.balance;
  const txs = real ? (dash?.recentTransactions ?? []) : [];

  return <MobileShell>
    <header className="pb-home-header">
      <div className="flex items-center justify-between">
        <Logo />
        {real ? (
          <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative text-primary-foreground hover:bg-primary-foreground/10">
            <Link to={guest ? "/login" : "/dashboard/notifications"}>
              <Bell />
              {(dash?.unreadNotifications ?? 0) > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-lime" />}
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Notifications" className="text-primary-foreground hover:bg-primary-foreground/10"><Bell /></Button>
        )}
      </div>
      <h1>{guest ? <>Welcome to<br />PowerBank 👋</> : <>Welcome back,<br />{displayName} 👋</>}</h1>
    </header>
    <main className="pb-content relative -mt-11">
      <div className="pb-balance"><p className="pb-balance-label">Available Balance</p><p className="pb-balance-value">{inr(avail)}</p><img src={walletImg.url} alt="Wallet and gold coins" /></div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="pb-stat"><TrendingUp /><p className="pb-stat-label">Withdrawable<br />Earnings</p><p className="pb-stat-value">{inr(wdr)}</p></div>
        <div className="pb-stat"><Wallet /><p className="pb-stat-label">Deposit Funds</p><p className="pb-stat-value">{inr(dep)}</p></div>
      </div>
      {guest ? (
        <div className="my-4 grid grid-cols-2 gap-3">
          <Button asChild className="h-11 rounded-full font-semibold"><Link to="/login">Log In</Link></Button>
          <Button asChild variant="outline" className="h-11 rounded-full border-primary bg-card font-semibold text-primary"><Link to="/signup">Create Account</Link></Button>
        </div>
      ) : (
        <div className="my-4 grid grid-cols-2 gap-3">
          <Button asChild className="h-11 rounded-full font-semibold"><Link to="/deposit"><Plus />Add Funds</Link></Button>
          <Button asChild variant="outline" className="h-11 rounded-full border-primary bg-card font-semibold text-primary"><Link to="/withdraw">Withdraw</Link></Button>
        </div>
      )}
      <div className="rounded-[22px] bg-card">
        {txs.length ? (
          <ul className="divide-y px-4 py-2">{txs.slice(0, 4).map(t => (
            <li key={t.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <div className="min-w-0"><p className="truncate font-semibold">{t.type}</p><p className="text-[11px] text-muted-foreground">{fmtDate(t.date, true)}</p></div>
              <div className="text-right"><p className={`font-bold ${t.direction === "credit" ? "text-success" : "text-foreground"}`}>{t.direction === "credit" ? "+" : "-"}{inr(t.amount)}</p><Status s={t.status} /></div>
            </li>
          ))}</ul>
        ) : <EmptyState text={guest ? "Log in to view your wallet balance and transactions." : "Start investing to see your transactions here."} />}
      </div>
      <Link to={guest ? "/login" : "/wallet"} className="mt-2 block text-center text-xs font-semibold text-primary">{guest ? "Sign in to manage wallet" : "View all transactions"}</Link>
    </main>
  </MobileShell>;
}
